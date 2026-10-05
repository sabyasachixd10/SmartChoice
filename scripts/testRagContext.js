require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('../backend/node_modules/mongoose');
const connectDB = require('../backend/config/database');
const ragRetrievalService = require('../backend/services/ragRetrievalService');

async function testRagQueries() {
  await connectDB();

  const queries = [
    "salty potato snack",
    "sweet fizzy cola drink",
    "healthy high fiber crispbread"
  ];

  for (const q of queries) {
    console.log(`\n======================================================`);
    console.log(`RAG CONTEXT FOR: "${q}"`);
    console.log(`======================================================`);
    
    try {
      const context = await ragRetrievalService.retrieveRagContext(q, { topK: 3 });
      
      const contextJson = JSON.stringify(context, null, 2);
      
      // Basic validation checks
      const hasSecret = contextJson.includes(process.env.HUGGINGFACE_API_KEY) || contextJson.includes(process.env.MONGODB_URI);
      const hasEmbedding = contextJson.includes('"embedding":') || contextJson.includes('"vector":') || contextJson.includes('384');
      
      if (hasSecret) console.warn("WARNING: Secret found in context!");
      if (hasEmbedding) console.warn("WARNING: Embedding vector found in context!");
      
      // Print context snippet
      context.products.forEach((p, i) => {
        console.log(`${i+1}. ${p.name} (${p.brand})`);
        console.log(`   Semantic Similarity: ${(p.similarityScore * 100).toFixed(2)}%`);
        console.log(`   SmartChoice Score: ${p.smartChoice.score} (${p.smartChoice.confidence})`);
        console.log(`   Preference Match: ${p.preferenceMatch.status}`);
      });
      
      console.log(`\nRaw JSON sample (first product):`);
      if (context.products.length > 0) {
         console.log(JSON.stringify(context.products[0], null, 2));
      } else {
         console.log("No products retrieved.");
      }
      
    } catch (err) {
      console.error(`Error querying "${q}":`, err.message);
    }
  }

  mongoose.connection.close();
  console.log('\nDatabase connection closed.');
}

testRagQueries();
