require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const axios = require('../backend/node_modules/axios');

const PORT = process.env.PORT || 8080;
const API_URL = `http://localhost:${PORT}/api/rag/query`;

async function runTests() {
  console.log(`\n--- Starting RAG Query API Tests at ${API_URL} ---`);
  let passed = 0;
  let failed = 0;

  const test = async (name, payload, expectedStatus, checkFn) => {
    try {
      const res = await axios.post(API_URL, payload, { validateStatus: () => true });
      if (res.status === expectedStatus && (!checkFn || checkFn(res.data))) {
        console.log(`✅ TEST PASSED: ${name}`);
        passed++;
      } else {
        console.error(`❌ TEST FAILED: ${name}`);
        console.error(`   Expected Status: ${expectedStatus}, Got: ${res.status}`);
        if (checkFn && res.status === expectedStatus) {
          console.error(`   Response did not pass check function. Response Data:`, JSON.stringify(res.data, null, 2));
        }
        failed++;
      }
    } catch (err) {
      console.error(`❌ TEST ERRORED: ${name}`, err.message);
      failed++;
    }
  };

  // A. Valid natural-language query
  await test('A. Valid natural-language query', { query: 'healthy high fiber breakfast cereal' }, 200, (data) => {
    return data.success === true && data.data && data.data.query && data.data.products;
  });

  // B. Query with explicit topK
  await test('B. Query with explicit topK', { query: 'dark chocolate bar', topK: 2 }, 200, (data) => {
    return data.success === true && data.data.retrieval.topKRequested === 2;
  });

  // C. Missing query
  await test('C. Missing query', { topK: 5 }, 400, (data) => {
    return data.success === false && data.error.includes('required');
  });

  // D. Empty query
  await test('D. Empty query', { query: '   ' }, 400, (data) => {
    return data.success === false && data.error.includes('non-empty');
  });

  // E. Invalid topK
  await test('E. Invalid topK (too high)', { query: 'chips', topK: 15 }, 400, (data) => {
    return data.success === false && data.error.includes('between 1 and 10');
  });

  // F. Unsupported/out-of-catalog query
  await test('F. Unsupported/out-of-catalog query', { query: 'smartphone iphone 15 pro max' }, 200, (data) => {
    // Should still return 200 but might have no strong matches or have insufficient evidence
    return data.success === true && data.data.retrieval;
  });

  // G. Response does not expose embeddings or secrets
  await test('G. Response does not expose embeddings or secrets', { query: 'healthy snack' }, 200, (data) => {
    const jsonStr = JSON.stringify(data);
    const hasRawEmbedding = jsonStr.includes('"embedding":') || (data.data && data.data.products && data.data.products.some(p => p.embedding || p.vector));
    const hasEnvVars = process.env.MONGODB_URI ? jsonStr.includes(process.env.MONGODB_URI) : false;
    return data.success === true && !hasRawEmbedding && !hasEnvVars;
  });

  console.log(`\n--- Test Summary: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

runTests();
