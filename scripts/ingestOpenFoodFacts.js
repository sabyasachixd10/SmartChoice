require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const fs = require('fs');
const path = require('path');
const axios = require('../backend/node_modules/axios');
const mongoose = require('../backend/node_modules/mongoose');
const connectDB = require('../backend/config/database');
const Product = require('../backend/models/Product');
const { normalizeProduct } = require('../backend/services/openFoodFactsService');

const REPORT_FILE = path.join(__dirname, '../evaluation/ingestionReport.json');

const CATEGORIES_TO_TARGET = [
  'beverages',
  'soft-drinks',
  'fruit-juices',
  'dairies',
  'yogurts',
  'cheeses',
  'cereals',
  'oats',
  'breads',
  'crispbreads',
  'biscuits',
  'snacks',
  'potato-chips',
  'chocolates',
  'sauces',
  'prepared-meals',
  'frozen-foods',
  'fruits',
  'vegetables',
  'plant-based-foods'
];

const axiosInstance = axios.create({
  timeout: 12000,
  headers: {
    'User-Agent': 'SmartChoice - Web - Version 1.0 - www.smartchoice.local'
  }
});

async function fetchOffCategoryPage(category, page = 1, pageSize = 50, retries = 3) {
  const url = 'https://world.openfoodfacts.org/cgi/search.pl';
  const params = {
    tagtype_0: 'categories',
    tag_contains_0: 'contains',
    tag_0: category,
    action: 'process',
    json: 1,
    page_size: pageSize,
    page: page
  };

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axiosInstance.get(url, { params });
      if (response.data && Array.isArray(response.data.products)) {
        return response.data.products;
      }
      return [];
    } catch (err) {
      console.warn(`  [Attempt ${attempt}/${retries}] Failed fetching category "${category}" page ${page}: ${err.message}`);
      if (attempt === retries) return [];
      await new Promise(r => setTimeout(r, 1000 * attempt));
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

  // Must have at least some nutrition data OR ingredients
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

async function runIngestion() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  let targetLimit = 500;

  const limitIdx = args.indexOf('--limit');
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    targetLimit = parseInt(args[limitIdx + 1], 10) || 500;
  }

  targetLimit = Math.min(Math.max(targetLimit, 1), 1000);

  console.log(`======================================================`);
  console.log(`OPEN FOOD FACTS PRODUCT INGESTION PIPELINE`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (No Database Modifications)' : 'LIVE (Database Upsert)'}`);
  console.log(`Target Accepted Products: ${targetLimit}`);
  console.log(`======================================================\n`);

  if (!isDryRun) {
    console.log('Connecting to database...');
    await connectDB();
  }

  const startedAt = new Date().toISOString();
  const seenBarcodes = new Set();
  const acceptedProducts = [];
  const categoryCounts = {};
  const skipReasons = {};

  let totalFetchedRaw = 0;
  let skippedCount = 0;
  let duplicateCount = 0;
  let errorsCount = 0;

  console.log('Fetching candidate products from Open Food Facts across categories...\n');

  let categoryIndex = 0;
  const pageMap = {};
  CATEGORIES_TO_TARGET.forEach(cat => { pageMap[cat] = 1; });

  const maxPerCategory = Math.max(Math.ceil(targetLimit / CATEGORIES_TO_TARGET.length), 15);
  const categoryAcceptedCount = {};

  while (acceptedProducts.length < targetLimit) {
    let newAcceptedInCycle = 0;

    for (const category of CATEGORIES_TO_TARGET) {
      if (acceptedProducts.length >= targetLimit) break;

      const currentCatCount = categoryAcceptedCount[category] || 0;
      if (currentCatCount >= maxPerCategory && acceptedProducts.length < targetLimit * 0.9) {
        continue; // Move to next category to balance distribution
      }

      const page = pageMap[category];
      console.log(`Fetching category "${category}" (Page ${page})... [Accepted: ${acceptedProducts.length}/${targetLimit}]`);

      const rawProducts = await fetchOffCategoryPage(category, page, 40);
      pageMap[category] = page + 1;

      if (rawProducts.length > 0) {
        totalFetchedRaw += rawProducts.length;

        for (const rawDoc of rawProducts) {
          if (acceptedProducts.length >= targetLimit) break;
          const catCount = categoryAcceptedCount[category] || 0;
          if (catCount >= maxPerCategory && acceptedProducts.length < targetLimit * 0.9) break;

          try {
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
            newAcceptedInCycle++;

            categoryAcceptedCount[category] = (categoryAcceptedCount[category] || 0) + 1;
            categoryCounts[category] = (categoryCounts[category] || 0) + 1;

          } catch (err) {
            errorsCount++;
            skipReasons['normalization_error'] = (skipReasons['normalization_error'] || 0) + 1;
          }
        }
      }

      // Small delay between category requests to be polite to OFF API
      await new Promise(r => setTimeout(r, 250));
    }

    // If a full cycle across all categories yielded no new accepted products, break
    if (newAcceptedInCycle === 0) {
      console.warn('No new valid products found in recent cycle across all categories. Completing fetch.');
      break;
    }
  }

  console.log(`\nCandidate gathering completed. Accepted ${acceptedProducts.length} unique valid products.`);

  let insertedCount = 0;
  let updatedCount = 0;

  if (isDryRun) {
    console.log('\n[DRY-RUN] Simulating MongoDB upsert behavior...');
    acceptedProducts.forEach(p => {
      // In dry run, count all as inserted/updated simulation
      insertedCount++;
    });
    console.log(`[DRY-RUN] Would insert/update ${acceptedProducts.length} products into MongoDB.`);
  } else {
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

  const report = {
    source: 'Open Food Facts',
    startedAt,
    completedAt,
    dryRun: isDryRun,
    requested: targetLimit,
    accepted: acceptedProducts.length,
    inserted: insertedCount,
    updated: updatedCount,
    duplicates: duplicateCount,
    skipped: skippedCount,
    errors: errorsCount,
    categories: categoryCounts,
    skipReasons
  };

  // Security check: assert no secrets in report
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
  console.log(`Inserted (New): ${insertedCount}`);
  console.log(`Updated (Existing): ${updatedCount}`);
  console.log(`Batch Duplicates Skipped: ${duplicateCount}`);
  console.log(`Total Invalid/Incomplete Skipped: ${skippedCount}`);
  console.log(`Errors Encountered: ${errorsCount}`);
  console.log(`Category Breakdown:`);
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
