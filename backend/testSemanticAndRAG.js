const axios = require('axios');

const semanticQueries = [
  "healthy high protein breakfast",
  "low sugar biscuit",
  "high fiber snack",
  "Indian instant noodles",
  "healthy packaged food"
];

const ragQueries = [
  "Which product has the most fiber?",
  "Which biscuit is better for a high protein diet?",
  "What are some healthier packaged snack options?"
];

async function run() {
  console.log('--- SEMANTIC SEARCH TESTS ---');
  for (const q of semanticQueries) {
    try {
      const res = await axios.get(`http://localhost:8080/api/search/semantic?q=${encodeURIComponent(q)}&limit=5`);
      console.log(`\nQuery: "${q}"`);
      const results = res.data.data;
      results.forEach((r, i) => {
        console.log(`  ${i+1}. [Score: ${r.semanticScore.toFixed(4)}] ${r.product.identity.name} (${r.product.identity.brand || 'Unknown Brand'})`);
      });
    } catch (e) {
      console.error(`Error querying "${q}":`, e.message);
    }
  }

  console.log('\n--- RAG RETRIEVAL TESTS ---');
  for (const q of ragQueries) {
    try {
      const res = await axios.post('http://localhost:8080/api/rag/query', { query: q, chatHistory: [] });
      console.log(`\nQuery: "${q}"`);
      const data = res.data.data;
      console.log(`  Retrieved Context length: ${data.retrieval ? data.retrieval.length : 0} characters`);
      console.log(`  Number of Products retrieved: ${data.products ? data.products.length : 0}`);
      if (data.products && data.products.length > 0) {
        console.log(`  Top products given to LLM: ${data.products.map(p => p.identity.name).join(', ')}`);
      }
    } catch (e) {
      console.error(`Error with RAG query "${q}":`, e.message);
    }
  }
}

run();
