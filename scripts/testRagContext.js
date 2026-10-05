require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('../backend/node_modules/mongoose');
const connectDB = require('../backend/config/database');
const ragRetrievalService = require('../backend/services/ragRetrievalService');

async function testRagQueries() {
  await connectDB();

  const queries = [
    "salty potato snack",
    "sweet fizzy cola drink",
    "healthy high fiber crispbread",
    "orange juice"
  ];

  for (const q of queries) {
    console.log(`\n======================================================`);
    console.log(`RAG CONTEXT FOR: "${q}"`);
    console.log(`======================================================`);
    
    try {
      const context = await ragRetrievalService.retrieveRagContext(q, { topK: 3 });
      
      const contextJson = JSON.stringify(context, null, 2);
      
      // Basic validation checks
      const hfKey = process.env.HUGGINGFACE_API_KEY;
      const mongoUri = process.env.MONGODB_URI;
      const hasSecret = (hfKey && contextJson.includes(hfKey)) || 
                        (mongoUri && contextJson.includes(mongoUri)) || 
                        contextJson.includes('"password"') || 
                        contextJson.includes('"secret"');
      
      const hasEmbedding = contextJson.includes('"embedding":') || 
                           contextJson.includes('"vector":') || 
                           contextJson.includes('384'); // Typical embedding dimension mentions
      
      if (hasSecret) throw new Error("Security failure: Secret found in context!");
      if (hasEmbedding) throw new Error("Security failure: Embedding vector found in context!");
      
      if (!context.retrieval) throw new Error("Missing retrieval summary");
      if (!context.retrieval.method) throw new Error("Missing retrieval method");
      if (typeof context.retrieval.strongResults !== 'number') throw new Error("Missing strongResults count");
      if (typeof context.retrieval.hasSufficientEvidence !== 'boolean') throw new Error("Missing hasSufficientEvidence");

      if (context.products.length > 0) {
        const p = context.products[0];
        if (!p.retrievalQuality || !p.retrievalQuality.classification || !p.retrievalQuality.threshold) throw new Error("Missing retrievalQuality");
        if (!p.evidence || !p.evidence.source) throw new Error("Missing evidence");
        if (p.smartChoice) throw new Error("smartChoice must be under calculated, not root");
        if (!p.facts) throw new Error("Missing facts");
        if (!p.calculated || !p.calculated.smartChoice) throw new Error("Missing calculated metrics");
        if (p.facts.nutrition && typeof p.facts.nutrition === 'object' && p.facts.nutrition.availability) {
            // Valid facts format structure
        } else {
            throw new Error("Missing facts format structure");
        }
      }

      // Print context snippet
      console.log(`Retrieval Summary:`);
      console.log(`  Sufficient Evidence: ${context.retrieval.hasSufficientEvidence}`);
      console.log(`  Results (Total: ${context.retrieval.resultsReturned} | Strong: ${context.retrieval.strongResults} | Moderate: ${context.retrieval.moderateResults} | Weak: ${context.retrieval.weakResults})`);
      console.log(`  Message: ${context.retrieval.message}`);

      console.log(`\nProducts:`);
      context.products.forEach((p, i) => {
        console.log(`${i+1}. ${p.facts.name.value} (${p.facts.brand.value}) - Relevance: ${p.retrievalQuality.classification}`);
        console.log(`   Semantic Similarity: ${(p.retrievalQuality.score * 100).toFixed(2)}%`);
        console.log(`   SmartChoice Score: ${p.calculated.smartChoice.score} (${p.calculated.smartChoice.confidence})`);
        console.log(`   Preference Match: ${p.calculated.preferenceMatch.status}`);
      });
      
      if (q === "orange juice") {
         console.log(`\nRaw JSON sample (first product):`);
         if (context.products.length > 0) {
            console.log(JSON.stringify(context.products[0], null, 2));
         } else {
            console.log("No products retrieved.");
         }
      }
      
    } catch (err) {
      console.error(`Error querying "${q}":`, err.message);
    }
  }

  mongoose.connection.close();
  console.log('\nDatabase connection closed.');
}

testRagQueries();
