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
    const cursor = limit > 0 
      ? Product.find(query).limit(limit).cursor()
      : Product.find(query).cursor();
    
    let totalCount = limit > 0 ? limit : await Product.countDocuments(query);
    console.log(`Found ${totalCount} total products to process (Limit: ${limit || 'None'})`);

    let processed = 0;
    let generated = 0;
    let reused = 0;
    let failed = 0;

    for await (const product of cursor) {
      processed++;
      console.log(`Processing ${processed}/${totalCount}: ${product.identity?.name || product._id}`);
      
      try {
        const wasGenerated = await productEmbeddingService.ensureProductEmbedding(product, true);
        
        if (wasGenerated) {
          generated++;
          console.log(`  -> Generated new embedding (Dimensions: ${product.embedding.dimensions})`);
        } else {
          reused++;
          console.log(`  -> Reused existing embedding`);
        }
      } catch (err) {
        failed++;
        console.error(`  -> Failed to generate embedding for ${product._id}:`, err.message);
        // Continue to next product without failing the whole batch
      }
      
      // Add a slight delay to respect rate limits on Hugging Face free tier
      await new Promise(r => setTimeout(r, 200));
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
