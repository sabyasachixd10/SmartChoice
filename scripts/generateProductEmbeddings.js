require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('../backend/node_modules/mongoose');
const Product = require('../backend/models/Product');
const productEmbeddingService = require('../backend/services/productEmbeddingService');
const connectDB = require('../backend/config/database');

async function run() {
  console.log('Connecting to database...');
  await connectDB();
  
  console.log(`Using Model: ${process.env.HUGGINGFACE_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2'}`);

  if (!process.env.HUGGINGFACE_API_KEY) {
    console.error('ERROR: HUGGINGFACE_API_KEY is missing in .env');
    process.exit(1);
  }

  const limit = process.argv[2] ? parseInt(process.argv[2]) : 0; // Optional limit argument

  try {
    const query = {};
    const products = limit > 0 
      ? await Product.find(query).limit(limit)
      : await Product.find(query);
    
    let totalCount = products.length;
    console.log(`Found ${totalCount} total products to process (Limit: ${limit || 'None'})`);

    let processed = 0;
    let generated = 0;
    let reused = 0;
    let failed = 0;

    const concurrency = 2;
    for (let i = 0; i < products.length; i += concurrency) {
      const batch = products.slice(i, i + concurrency);
      await Promise.all(batch.map(async (product) => {
        processed++;
        try {
          const wasGenerated = await productEmbeddingService.ensureProductEmbedding(product, true);
          if (wasGenerated) {
            generated++;
            console.log(`[${processed}/${totalCount}] Generated embedding for: ${product.identity?.name || product._id}`);
          } else {
            reused++;
          }
        } catch (err) {
          failed++;
          console.error(`[${processed}/${totalCount}] Failed embedding for ${product._id}:`, err.message);
        }
      }));
      
      // Delay between batch chunks to respect HF rate limits
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n--- EMBEDDING GENERATION SUMMARY ---');
    console.log(`Total Processed: ${processed}`);
    console.log(`Generated: ${generated}`);
    console.log(`Already current (Reused): ${reused}`);
    console.log(`Failed: ${failed}`);
    console.log('------------------------------------');

  } catch (error) {
    console.error('Fatal error during embedding generation:', error);
  } finally {
    mongoose.connection.close();
    console.log('Database connection closed.');
  }
}

run();
