require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const mongoose = require('../backend/node_modules/mongoose');
const connectDB = require('../backend/config/database');
const vectorSearchService = require('../backend/services/vectorSearchService');

async function testQueries() {
  await connectDB();

  const queries = [
    "salty potato snack",
    "sweet fizzy cola drink",
    "healthy high fiber crispbread"
  ];

  for (const q of queries) {
    console.log(`\n======================================================`);
    console.log(`QUERY: "${q}"`);
    console.log(`======================================================`);
    
    try {
      const results = await vectorSearchService.semanticProductSearch(q, { limit: 3 });
      
      if (results.length === 0) {
        console.log("No results found.");
      } else {
        results.forEach((res, i) => {
          console.log(`${i+1}. ${res.product.identity?.name} (${res.product.identity?.brand})`);
          console.log(`   Semantic Score: ${(res.semanticScore * 100).toFixed(2)}%`);
          console.log(`   Categories: ${res.product.identity?.categories?.slice(0,2).join(', ')}`);
        });
      }
    } catch (err) {
      console.error(`Error querying "${q}":`, err.message);
    }
  }

  mongoose.connection.close();
  console.log('\nDatabase connection closed.');
}

testQueries();
