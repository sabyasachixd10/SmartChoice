require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const axios = require('../backend/node_modules/axios');
const mongoose = require('../backend/node_modules/mongoose');
const connectDB = require('../backend/config/database');
const Product = require('../backend/models/Product');
const { normalizeProduct } = require('../backend/services/openFoodFactsService');

const REPORT_FILE = path.join(__dirname, '../evaluation/ingestionReport.json');
const DATA_DIR = path.join(__dirname, '../data');
const RAW_DIR = path.join(DATA_DIR, 'raw/openfoodfacts_india');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const PROCESSED_FILE = path.join(PROCESSED_DIR, 'products_india.json');

const CATEGORIES_TO_TARGET = [
  'snacks',
  'biscuits',
  'cereals',
  'noodles',
  'beverages',
  'fruit-juices',
  'dairies',
  'chocolates',
  'confectioneries',
  'sauces',
  'spreads',
  'frozen-foods',
  'meals',
  'groceries',
  'sweet-snacks',
  'salty-snacks'
];

const axiosInstance = axios.create({
  timeout: 30000,
  headers: {
    'User-Agent': 'SmartChoiceDataIngestion/1.0 (contact@smartchoice.local)'
  }
});

function setupDirectories() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });
  if (!fs.existsSync(PROCESSED_DIR)) fs.mkdirSync(PROCESSED_DIR, { recursive: true });
  
  const readmePath = path.join(DATA_DIR, 'README.md');
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, '# SmartChoice Local Data\nThis directory contains raw and processed data snapshots used for ingestion and validation. Raw OFF dumps are stored in `raw/` and the normalized target dataset in `processed/`. Do not commit huge raw data files.\n');
  }
}

async function fetchOffCategoryPage(category, page = 1, pageSize = 20, retries = 3, isIndia = false) {
  const searchUrl = 'https://world.openfoodfacts.org/api/v2/search';
  
  const params = {
    categories_tags_en: category,
    page_size: pageSize,
    page: page
  };

  if (isIndia) {
    params.countries_tags_en = 'india';
  }

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axiosInstance.get(searchUrl, { params });
      
      // Delay to avoid hitting 429
      await new Promise(r => setTimeout(r, 2000));
      
      if (response.data && Array.isArray(response.data.products)) {
        return response.data.products;
      }
      return [];
    } catch (err) {
      console.warn(`  [Attempt ${attempt}/${retries}] Failed fetching category "${category}" page ${page}: ${err.message}`);
      if (attempt === retries) return [];
      const delay = (err.response && err.response.status === 429) ? 10000 * attempt : 3000 * attempt;
      await new Promise(r => setTimeout(r, delay));
    }
  }
  return [];
}

function isValidProduct(p, skipReasons) {
  if (!p || !p.identity) {
    skipReasons['invalid_structure'] = (skipReasons['invalid_structure'] || 0) + 1;
    return false;
  }

  const barcode = p.identity.barcode;
  if (!barcode || typeof barcode !== 'string' || barcode.trim().length < 3) {
    skipReasons['missing_barcode'] = (skipReasons['missing_barcode'] || 0) + 1;
    return false;
  }

  const name = p.identity.name;
  if (!name || name === 'Unknown Product' || name.trim().length === 0) {
    skipReasons['missing_name'] = (skipReasons['missing_name'] || 0) + 1;
    return false;
  }

  const hasNutrition = p.nutrition && Object.values(p.nutrition).some(v => v !== null && v !== undefined);
  const hasIngredients = p.ingredients?.ingredients && p.ingredients.ingredients.length > 0;

  if (!hasNutrition && !hasIngredients) {
    skipReasons['missing_nutrition_and_ingredients'] = (skipReasons['missing_nutrition_and_ingredients'] || 0) + 1;
    return false;
  }

  if ((p.dataQuality?.completeness || 0) < 15) {
    skipReasons['low_data_quality'] = (skipReasons['low_data_quality'] || 0) + 1;
    return false;
  }

  return true;
}

function extractCountryTags(rawDoc) {
  let tags = [];
  if (rawDoc.countries_tags_en) tags = tags.concat(rawDoc.countries_tags_en);
  if (rawDoc.countries_tags) tags = tags.concat(rawDoc.countries_tags);
  if (rawDoc.origins_tags) tags = tags.concat(rawDoc.origins_tags);
  if (rawDoc.manufacturing_places_tags) tags = tags.concat(rawDoc.manufacturing_places_tags);
  if (rawDoc.stores_tags) tags = tags.concat(rawDoc.stores_tags);
  if (rawDoc.labels_tags) tags = tags.concat(rawDoc.labels_tags);
  return tags.map(t => typeof t === 'string' ? t.toLowerCase() : '').filter(t => t.includes('india'));
}

async function runIngestion() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--replace');
  const isIndia = args.includes('--india');
  const isReplace = args.includes('--replace');
  let targetLimit = 500;

  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    targetLimit = parseInt(args[limitIdx + 1], 10) || 500;
  }

  targetLimit = Math.min(Math.max(targetLimit, 1), 1500);

  setupDirectories();

  console.log(`======================================================`);
  console.log(`OPEN FOOD FACTS PRODUCT INGESTION PIPELINE`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (No Database Modifications)' : 'REPLACE (Live Database Upsert)'}`);
  console.log(`Target Location: ${isIndia ? 'INDIA FOCUS' : 'GLOBAL'}`);
  console.log(`Target Accepted Products: ${targetLimit}`);
  console.log(`======================================================\n`);

  if (!isDryRun) {
    console.log('Connecting to database...');
    await connectDB();
  }

  const startedAt = new Date().toISOString();
  const seenBarcodes = new Set();
  const acceptedProducts = [];
  const rawSnapshots = [];
  const categoryCounts = {};
  const skipReasons = {};
  const brandDistribution = {};
  const indiaMetadataCount = { count: 0, details: {} };

  let totalFetchedRaw = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let errorsCount = 0;

  console.log('Fetching candidate products from Open Food Facts across categories...\n');

  const pageMap = {};
  CATEGORIES_TO_TARGET.forEach(cat => { pageMap[cat] = 1; });
  const maxPerCategory = Math.max(Math.ceil(targetLimit / CATEGORIES_TO_TARGET.length), 30);
  const categoryAcceptedCount = {};

  while (acceptedProducts.length < targetLimit) {
    let newAcceptedInCycle = 0;

    for (const category of CATEGORIES_TO_TARGET) {
      if (acceptedProducts.length >= targetLimit) break;

      const currentCatCount = categoryAcceptedCount[category] || 0;
      if (currentCatCount >= maxPerCategory && acceptedProducts.length < targetLimit * 0.9) {
        continue;
      }

      const page = pageMap[category];
      console.log(`Fetching category "${category}" (Page ${page})... [Accepted: ${acceptedProducts.length}/${targetLimit}]`);

      const rawProducts = await fetchOffCategoryPage(category, page, 50, 3, isIndia);
      pageMap[category] = page + 1;

      if (rawProducts.length > 0) {
        totalFetchedRaw += rawProducts.length;

        for (const rawDoc of rawProducts) {
          if (acceptedProducts.length >= targetLimit) break;
          const catCount = categoryAcceptedCount[category] || 0;
          if (catCount >= maxPerCategory && acceptedProducts.length < targetLimit * 0.9) break;

          try {
            const indiaTags = extractCountryTags(rawDoc);
            if (isIndia && indiaTags.length === 0 && (!rawDoc.brands || !rawDoc.brands.toLowerCase().includes('india'))) {
                // If it claims to be Indian from query but has absolutely no tags or brand info, we might skip or let it through.
                // The URL query itself guarantees `countries_tags_en: india`, so usually it is valid.
                // We'll trust the query but track evidence.
            }

            const normProduct = normalizeProduct(rawDoc);

            if (!isValidProduct(normProduct, skipReasons)) {
              skippedCount++;
              continue;
            }

            const barcode = normProduct.identity.barcode;
            if (seenBarcodes.has(barcode)) {
              duplicateCount++;
              skipReasons['duplicate_barcode_in_batch'] = (skipReasons['duplicate_barcode_in_batch'] || 0) + 1;
              skippedCount++;
              continue;
            }

            seenBarcodes.add(barcode);
            acceptedProducts.push(normProduct);
            
            // Track metadata for reporting
            if (indiaTags.length > 0) {
              indiaMetadataCount.count++;
              indiaTags.forEach(t => indiaMetadataCount.details[t] = (indiaMetadataCount.details[t] || 0) + 1);
            }
            
            const brand = normProduct.identity.brand || 'Unknown';
            brandDistribution[brand] = (brandDistribution[brand] || 0) + 1;

            if (isIndia) {
              rawSnapshots.push({
                barcode,
                name: normProduct.identity.name,
                india_evidence: indiaTags
              });
            }

            newAcceptedInCycle++;
            categoryAcceptedCount[category] = (categoryAcceptedCount[category] || 0) + 1;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;

          } catch (err) {
            errorsCount++;
            skipReasons['normalization_error'] = (skipReasons['normalization_error'] || 0) + 1;
          }
        }
      }

      await new Promise(r => setTimeout(r, 250));
    }

    if (newAcceptedInCycle === 0) {
      console.warn('No new valid products found in recent cycle across all categories. Completing fetch.');
      break;
    }
  }

  console.log(`\nCandidate gathering completed. Accepted ${acceptedProducts.length} unique valid products.`);

  if (isIndia && rawSnapshots.length > 0) {
    const rawFilePath = path.join(RAW_DIR, `snapshot_${Date.now()}.json`);
    fs.writeFileSync(rawFilePath, JSON.stringify(rawSnapshots, null, 2));
    console.log(`Saved raw OFF India evidence snapshot to ${rawFilePath}`);
    
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(acceptedProducts, null, 2));
    console.log(`Saved normalized India dataset to ${PROCESSED_FILE}`);
  }

  let insertedCount = 0;
  let updatedCount = 0;

  if (isDryRun) {
    console.log('\n[DRY-RUN] Simulating MongoDB upsert behavior...');
    console.log(`[DRY-RUN] Would insert/update ${acceptedProducts.length} products into MongoDB.`);
  } else {
    if (isReplace) {
      console.log('\n[WARNING] --replace flag provided. Deleting existing product catalog before insertion...');
      await Product.deleteMany({});
      console.log('Existing products deleted successfully.');
    }
    
    console.log('\nWriting accepted products to MongoDB Atlas (upserting by barcode)...');

    for (let i = 0; i < acceptedProducts.length; i++) {
      const p = acceptedProducts[i];
      try {
        const filter = { 'identity.barcode': p.identity.barcode };
        const update = { 
          $set: {
            'identity.name': p.identity.name,
            'identity.brand': p.identity.brand,
            'identity.categories': p.identity.categories,
            'identity.productType': p.identity.productType,
            'serving': p.serving,
            'media': p.media,
            'ingredients': p.ingredients,
            'nutrition': p.nutrition,
            'processing': p.processing,
            'source': p.source,
            'dataQuality': p.dataQuality
          }
        };

        const res = await Product.updateOne(filter, update, { upsert: true });
        if (res.upsertedCount > 0) {
          insertedCount++;
        } else if (res.matchedCount > 0) {
          updatedCount++;
        }

        if ((i + 1) % 100 === 0 || i + 1 === acceptedProducts.length) {
          console.log(`  Processed ${i + 1}/${acceptedProducts.length} MongoDB writes...`);
        }
      } catch (err) {
        errorsCount++;
        console.error(`  Failed writing barcode ${p.identity.barcode} to DB:`, err.message);
      }
    }
  }

  const completedAt = new Date().toISOString();

  // Get Top 10 brands
  const topBrands = Object.entries(brandDistribution)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {});

  const report = {
    source: 'Open Food Facts',
    startedAt,
    completedAt,
    dryRun: isDryRun,
    targetLocation: isIndia ? 'India' : 'Global',
    requested: targetLimit,
    fetchedRaw: totalFetchedRaw,
    accepted: acceptedProducts.length,
    inserted: insertedCount,
    updated: updatedCount,
    duplicates: duplicateCount,
    skipped: skippedCount,
    errors: errorsCount,
    indiaRelevance: {
      productsWithExplicitIndiaTags: indiaMetadataCount.count,
      percentage: ((indiaMetadataCount.count / acceptedProducts.length) * 100).toFixed(2) + '%',
      tagDistribution: indiaMetadataCount.details
    },
    topBrands,
    categories: categoryCounts,
    skipReasons
  };

  const reportStr = JSON.stringify(report, null, 2);
  const hfKey = process.env.HUGGINGFACE_API_KEY;
  const mongoUri = process.env.MONGODB_URI;

  if ((hfKey && reportStr.includes(hfKey)) || (mongoUri && reportStr.includes(mongoUri)) || reportStr.includes('"password"')) {
    throw new Error('Security check failed: Secret found in ingestion report!');
  }

  fs.writeFileSync(REPORT_FILE, reportStr, 'utf8');
  console.log(`\nSaved ingestion report to ${REPORT_FILE}`);

  console.log('\n======================================================');
  console.log('INGESTION SUMMARY REPORT');
  console.log('======================================================');
  console.log(`Requested Target: ${targetLimit}`);
  console.log(`Accepted Valid Products: ${acceptedProducts.length}`);
  console.log(`Products with Explicit India Tags: ${indiaMetadataCount.count} (${report.indiaRelevance.percentage})`);
  console.log(`Inserted (New): ${insertedCount}`);
  console.log(`Updated (Existing): ${updatedCount}`);
  console.log(`Batch Duplicates Skipped: ${duplicateCount}`);
  console.log(`Total Invalid/Incomplete Skipped: ${skippedCount}`);
  console.log(`Errors Encountered: ${errorsCount}`);
  console.log(`\nTop Brands:`);
  Object.entries(topBrands).forEach(([b, count]) => {
    console.log(`  - ${b}: ${count}`);
  });
  console.log(`\nCategory Breakdown:`);
  Object.entries(categoryCounts).forEach(([cat, count]) => {
    console.log(`  - ${cat}: ${count}`);
  });

  if (!isDryRun) {
    const totalInDB = await Product.countDocuments();
    console.log(`\nTotal Products in MongoDB Collection: ${totalInDB}`);
    mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

runIngestion().catch(err => {
  console.error('Fatal error in ingestion pipeline:', err);
  process.exit(1);
});
