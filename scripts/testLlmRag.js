require('../backend/node_modules/dotenv').config({ path: __dirname + '/../.env' });
const axios = require('../backend/node_modules/axios');

const PORT = process.env.PORT || 8080;
const API_URL = `http://localhost:${PORT}/api/rag/query`;

async function runTests() {
  console.log(`\n--- Starting LLM RAG Query API Tests at ${API_URL} ---`);
  
  if (!process.env.GEMINI_API_KEY) {
    console.error("⚠️ GEMINI_API_KEY is missing in environment! Testing missing key behavior.");
  } else {
    console.log("✅ GEMINI_API_KEY is present in environment.");
  }

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
          console.error(`   Response did not pass check function.`);
          console.error(`   Answer block:`, JSON.stringify(res.data?.data?.answer, null, 2));
        }
        failed++;
      }
    } catch (err) {
      console.error(`❌ TEST ERRORED: ${name}`, err.message);
      failed++;
    }
  };

  if (!process.env.GEMINI_API_KEY) {
     // F. Missing GEMINI_API_KEY behavior
     await test('F. Missing GEMINI_API_KEY behavior', { query: 'healthy high fiber breakfast cereal' }, 503, (data) => {
       return data.success === false && data.error.includes('GEMINI_API_KEY');
     });
     console.log("Exiting tests because API key is missing. Add key to continue tests A-E.");
     process.exit(passed > 0 && failed === 0 ? 0 : 1);
  }

  // A. Normal product discovery query
  await test('A. Normal product discovery query', { query: 'healthy high fiber breakfast cereal' }, 200, (data) => {
    const answer = data.data.answer;
    if (answer) console.log("Answer A generated:", answer.text.substring(0, 50) + "...");
    return data.success === true && answer && answer.text && answer.grounded === true;
  });
  await new Promise(resolve => setTimeout(resolve, 8000));

  // B. Nutritional comparison query
  await test('B. Nutritional comparison query', { query: 'Which retrieved product has the most fiber?' }, 200, (data) => {
    const answer = data.data.answer;
    if (answer) console.log("Answer B generated:", answer.text.substring(0, 50) + "...");
    return data.success === true && answer && answer.text && answer.grounded === true;
  });
  await new Promise(resolve => setTimeout(resolve, 8000));

  // C. SmartChoice-score question
  await test('C. SmartChoice-score question', { query: 'Which retrieved product has the highest SmartChoice Score?' }, 200, (data) => {
    const answer = data.data.answer;
    if (answer) console.log("Answer C generated:", answer.text.substring(0, 50) + "...");
    return data.success === true && answer && answer.text && answer.grounded === true;
  });
  await new Promise(resolve => setTimeout(resolve, 8000));

  // D. Unsupported/out-of-catalog query
  await test('D. Unsupported/out-of-catalog query', { query: 'best iPhone 15 Pro Max' }, 200, (data) => {
    const answer = data.data.answer;
    return data.success === true && answer && (answer.confidence === 'insufficient' || answer.confidence === 'medium');
  });
  await new Promise(resolve => setTimeout(resolve, 8000));

  // E. Query with incomplete evidence
  await test('E. Query with incomplete evidence', { query: 'spaceship rocket fuel' }, 200, (data) => {
    const answer = data.data.answer;
    return data.success === true && answer && (answer.confidence === 'insufficient' || answer.confidence === 'medium');
  });
  await new Promise(resolve => setTimeout(resolve, 8000));

  // G. Security check
  await test('G. Security check (no leaks)', { query: 'healthy snack' }, 200, (data) => {
    const jsonStr = JSON.stringify(data);
    const hasRawEmbedding = jsonStr.includes('"embedding":') || (data.data && data.data.products && data.data.products.some(p => p.embedding || p.vector));
    const hasEnvVars = process.env.MONGODB_URI ? jsonStr.includes(process.env.MONGODB_URI) : false;
    const hasApiKey = process.env.GEMINI_API_KEY ? jsonStr.includes(process.env.GEMINI_API_KEY) : false;
    return data.success === true && !hasRawEmbedding && !hasEnvVars && !hasApiKey;
  });

  console.log(`\n--- Test Summary: ${passed} passed, ${failed} failed ---`);
  if (failed > 0) process.exit(1);
}

runTests();
