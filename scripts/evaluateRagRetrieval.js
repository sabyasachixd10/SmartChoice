require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const mongoose = require('../backend/node_modules/mongoose');
const connectDB = require('../backend/config/database');
const Product = require('../backend/models/Product');
const ragRetrievalService = require('../backend/services/ragRetrievalService');

const QUERIES_FILE = path.join(__dirname, '../evaluation/ragQueries.json');
const RESULTS_JSON_FILE = path.join(__dirname, '../evaluation/ragEvaluationResults.json');
const RESULTS_CSV_FILE = path.join(__dirname, '../evaluation/ragEvaluationResults.csv');

function extractProductText(p) {
  const name = typeof p.facts?.name === 'string' ? p.facts.name : (p.facts?.name?.value || '');
  const brand = typeof p.facts?.brand === 'string' ? p.facts.brand : (p.facts?.brand?.value || '');
  
  let categories = [];
  if (Array.isArray(p.facts?.categories)) {
    categories = p.facts.categories;
  } else if (Array.isArray(p.facts?.categories?.value)) {
    categories = p.facts.categories.value;
  }

  let ingredients = [];
  if (Array.isArray(p.facts?.ingredients)) {
    ingredients = p.facts.ingredients;
  } else if (Array.isArray(p.facts?.ingredients?.value)) {
    ingredients = p.facts.ingredients.value;
  }

  return {
    name: (name || '').toLowerCase(),
    brand: (brand || '').toLowerCase(),
    categories: categories.map(c => (c || '').toLowerCase()),
    ingredients: ingredients.map(i => (i || '').toLowerCase()),
    fullText: `${name} ${brand} ${categories.join(' ')} ${ingredients.join(' ')}`.toLowerCase()
  };
}

function isProductRelevant(product, evalQuery) {
  const extracted = extractProductText(product);
  
  // 1. Category match
  const categoryMatch = (evalQuery.expectedCategories || []).some(expectedCat => {
    const normExpected = expectedCat.toLowerCase();
    return extracted.categories.some(prodCat => prodCat.includes(normExpected) || normExpected.includes(prodCat));
  });

  if (categoryMatch) return true;

  // 2. Keyword match using word boundaries to prevent false positives (e.g. apple in pineapple)
  const keywordMatch = (evalQuery.expectedKeywords || []).some(keyword => {
    const normKw = keyword.toLowerCase();
    const escaped = normKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}`, 'i');
    return regex.test(extracted.fullText);
  });

  return keywordMatch;
}

async function runEvaluation() {
  console.log('Connecting to database...');
  await connectDB();

  if (!fs.existsSync(QUERIES_FILE)) {
    throw new Error(`Evaluation queries file not found at ${QUERIES_FILE}`);
  }

  const queries = JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8'));
  console.log(`Loaded ${queries.length} evaluation queries.`);

  const topK = 5;
  const queryResults = [];
  const csvRows = [
    'queryId,query,rank,product,similarity,relevance,relevanceClass,hitAt1,hitAt3,hitAt5'
  ];

  let totalPrecision1 = 0;
  let totalPrecision3 = 0;
  let totalPrecision5 = 0;
  let hit1Count = 0;
  let hit3Count = 0;
  let hit5Count = 0;

  let totalStrongResults = 0;
  let totalModerateResults = 0;
  let totalWeakResults = 0;
  let totalRetrievedProducts = 0;
  let insufficientEvidenceCount = 0;

  for (const qObj of queries) {
    console.log(`\nEvaluating Query [${qObj.id}]: "${qObj.query}"`);
    
    const context = await ragRetrievalService.retrieveRagContext(qObj.query, { topK });
    const products = context.products || [];
    const hasSufficientEvidence = context.retrieval?.hasSufficientEvidence ?? false;
    
    if (!hasSufficientEvidence) {
      insufficientEvidenceCount++;
    }

    const evaluatedProducts = products.slice(0, topK).map((p, index) => {
      const relevant = isProductRelevant(p, qObj);
      const classification = p.retrievalQuality?.classification || 'weak';
      const similarity = p.retrievalQuality?.score || 0;

      if (classification === 'strong') totalStrongResults++;
      else if (classification === 'moderate') totalModerateResults++;
      else totalWeakResults++;

      totalRetrievedProducts++;

      const productName = p.facts?.name?.value || p.facts?.name || 'Unknown';
      const brandName = p.facts?.brand?.value || p.facts?.brand || 'Unknown';

      return {
        rank: index + 1,
        id: p.id,
        name: productName,
        brand: brandName,
        similarity,
        classification,
        relevant
      };
    });

    const relAt1 = evaluatedProducts.slice(0, 1).filter(p => p.relevant).length;
    const relAt3 = evaluatedProducts.slice(0, 3).filter(p => p.relevant).length;
    const relAt5 = evaluatedProducts.filter(p => p.relevant).length;

    const p1 = relAt1 / 1;
    const p3 = relAt3 / Math.min(3, Math.max(1, evaluatedProducts.length));
    const p5 = relAt5 / Math.min(5, Math.max(1, evaluatedProducts.length));

    const hit1 = relAt1 > 0;
    const hit3 = relAt3 > 0;
    const hit5 = relAt5 > 0;

    totalPrecision1 += p1;
    totalPrecision3 += p3;
    totalPrecision5 += p5;

    if (hit1) hit1Count++;
    if (hit3) hit3Count++;
    if (hit5) hit5Count++;

    evaluatedProducts.forEach(p => {
      const cleanQueryStr = `"${qObj.query.replace(/"/g, '""')}"`;
      const cleanProdStr = `"${(p.name + ' (' + p.brand + ')').replace(/"/g, '""')}"`;
      csvRows.push(`${qObj.id},${cleanQueryStr},${p.rank},${cleanProdStr},${p.similarity.toFixed(4)},${p.relevant},${p.classification},${hit1},${hit3},${hit5}`);
    });

    console.log(`Top ${evaluatedProducts.length} Results:`);
    evaluatedProducts.forEach(p => {
      console.log(`  ${p.rank}. ${p.name} (${p.brand}) — ${p.relevant ? 'RELEVANT' : 'IRRELEVANT'} — ${p.classification} — ${(p.similarity * 100).toFixed(2)}%`);
    });
    console.log(`  Hit@1: ${hit1} | Hit@3: ${hit3} | Hit@5: ${hit5}`);
    console.log(`  Precision@5: ${(p5 * 100).toFixed(1)}% | Sufficient Evidence: ${hasSufficientEvidence}`);

    queryResults.push({
      id: qObj.id,
      query: qObj.query,
      queryType: qObj.queryType,
      expectedAvailable: qObj.expectedAvailable,
      hasSufficientEvidence,
      metrics: {
        precisionAt1: p1,
        precisionAt3: p3,
        precisionAt5: p5,
        hitAt1: hit1,
        hitAt3: hit3,
        hitAt5: hit5,
        relevantCount: relAt5
      },
      retrieved: evaluatedProducts
    });
  }

  const numQueries = queries.length;
  const avgP1 = totalPrecision1 / numQueries;
  const avgP3 = totalPrecision3 / numQueries;
  const avgP5 = totalPrecision5 / numQueries;

  const hit1Rate = hit1Count / numQueries;
  const hit3Rate = hit3Count / numQueries;
  const hit5Rate = hit5Count / numQueries;

  const strongRate = totalRetrievedProducts > 0 ? totalStrongResults / totalRetrievedProducts : 0;
  const moderateRate = totalRetrievedProducts > 0 ? totalModerateResults / totalRetrievedProducts : 0;
  const weakRate = totalRetrievedProducts > 0 ? totalWeakResults / totalRetrievedProducts : 0;
  const insufficientEvidenceRate = insufficientEvidenceCount / numQueries;

  console.log('\n======================================================');
  console.log('RAG RETRIEVAL EVALUATION SUMMARY');
  console.log('======================================================');
  console.log(`Queries Evaluated: ${numQueries}`);
  console.log(`Precision@1: ${(avgP1 * 100).toFixed(2)}%`);
  console.log(`Precision@3: ${(avgP3 * 100).toFixed(2)}%`);
  console.log(`Precision@5: ${(avgP5 * 100).toFixed(2)}%`);
  console.log(`Hit@1: ${(hit1Rate * 100).toFixed(2)}% (${hit1Count}/${numQueries})`);
  console.log(`Hit@3: ${(hit3Rate * 100).toFixed(2)}% (${hit3Count}/${numQueries})`);
  console.log(`Hit@5: ${(hit5Rate * 100).toFixed(2)}% (${hit5Count}/${numQueries})`);
  console.log(`Strong Result Rate: ${(strongRate * 100).toFixed(2)}%`);
  console.log(`Moderate Result Rate: ${(moderateRate * 100).toFixed(2)}%`);
  console.log(`Weak Result Rate: ${(weakRate * 100).toFixed(2)}%`);
  console.log(`Insufficient Evidence Rate: ${(insufficientEvidenceRate * 100).toFixed(2)}%`);
  console.log('Recall: not_reliable (The current 12-product dataset does not represent the complete product universe.)');

  const unsupportedQueries = queryResults.filter(q => q.expectedAvailable === false);
  console.log('\nUnsupported Query Behavior:');
  unsupportedQueries.forEach(uq => {
    console.log(`  - "${uq.query}": Hits@5=${uq.metrics.hitAt5}, Relevant=${uq.metrics.relevantCount}, HasSufficientEvidence=${uq.hasSufficientEvidence}`);
  });

  const datasetSize = await Product.countDocuments();
  console.log(`Evaluated across dataset of ${datasetSize} products.`);

  const evaluationOutput = {
    metadata: {
      generatedAt: new Date().toISOString(),
      datasetSize,
      topK,
      evaluationVersion: "1.0",
      queryCount: numQueries
    },
    metrics: {
      precisionAt1: Number(avgP1.toFixed(4)),
      precisionAt3: Number(avgP3.toFixed(4)),
      precisionAt5: Number(avgP5.toFixed(4)),
      hitAt1: Number(hit1Rate.toFixed(4)),
      hitAt3: Number(hit3Rate.toFixed(4)),
      hitAt5: Number(hit5Rate.toFixed(4)),
      strongRate: Number(strongRate.toFixed(4)),
      moderateRate: Number(moderateRate.toFixed(4)),
      weakRate: Number(weakRate.toFixed(4)),
      insufficientEvidenceRate: Number(insufficientEvidenceRate.toFixed(4))
    },
    recall: {
      status: datasetSize >= 500 ? "evaluating_expanded_catalog" : "not_reliable",
      reason: datasetSize >= 500 
        ? `Evaluated across ${datasetSize} products across 19 categories from Open Food Facts ingestion.` 
        : `The current ${datasetSize}-product dataset does not represent the complete product universe.`
    },
    queries: queryResults
  };

  // Security check: assert no secrets or embedding vectors in JSON or CSV
  const jsonStr = JSON.stringify(evaluationOutput);
  const csvStr = csvRows.join('\n');

  const hfKey = process.env.HUGGINGFACE_API_KEY;
  const mongoUri = process.env.MONGODB_URI;

  const hasSecret = (hfKey && (jsonStr.includes(hfKey) || csvStr.includes(hfKey))) ||
                    (mongoUri && (jsonStr.includes(mongoUri) || csvStr.includes(mongoUri))) ||
                    jsonStr.includes('"password"') || jsonStr.includes('"secret"');

  const hasEmbedding = jsonStr.includes('"embedding":') || jsonStr.includes('"vector":');

  if (hasSecret) throw new Error("Security check failed: Secret leaked into evaluation output!");
  if (hasEmbedding) throw new Error("Security check failed: Embedding vector leaked into evaluation output!");

  fs.writeFileSync(RESULTS_JSON_FILE, JSON.stringify(evaluationOutput, null, 2), 'utf8');
  console.log(`\nSaved machine-readable results to ${RESULTS_JSON_FILE}`);

  fs.writeFileSync(RESULTS_CSV_FILE, csvStr, 'utf8');
  console.log(`Saved CSV report to ${RESULTS_CSV_FILE}`);

  // 6. Test Edge cases in script
  console.log('\n------------------------------------------------------');
  console.log('RUNNING EVALUATION EDGE CASES TEST...');
  console.log('------------------------------------------------------');
  const edgeCases = [
    { name: 'normal query', text: 'salty potato snack' },
    { name: 'unsupported query', text: 'fresh apples' },
    { name: 'query with unusual capitalization', text: 'SaLtY pOtAtO sNaCk' },
    { name: 'query with extra whitespace', text: '   healthy   high   fiber   crispbread   ' }
  ];

  for (const ec of edgeCases) {
    const res = await ragRetrievalService.retrieveRagContext(ec.text, { topK: 3 });
    if (!res || !res.retrieval) {
      throw new Error(`Edge case test failed for: ${ec.name}`);
    }
    console.log(`Edge Case ["${ec.name}"]: Context returned successfully with ${res.products.length} products.`);
  }

  mongoose.connection.close();
  console.log('\nDatabase connection closed successfully.');
}

runEvaluation().catch(err => {
  console.error('Evaluation failed:', err);
  process.exit(1);
});
