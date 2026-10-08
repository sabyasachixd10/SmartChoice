const axios = require('axios');
const fs = require('fs');
const path = require('path');

const queries = [
  "Which product has the most fiber?",
  "Which biscuit has the lowest sugar?",
  "Which product has the highest protein?",
  "Which snack has the best SmartChoice Score?",
  "Which packaged food is a better alternative to a high-sugar snack?",
  "Give me some high-protein breakfast options.",
  "Which products contain the most saturated fat?",
  "What are some lower-sugar beverage options?",
  "Which product is best for a high-fiber diet?",
  "Do you have fresh organic bananas?"
];

async function run() {
  const auditResults = [];

  for (const q of queries) {
    try {
      console.log(`Auditing query: "${q}"`);
      const res = await axios.post('http://localhost:8080/api/rag/query', { query: q, chatHistory: [] });
      const data = res.data.data;
      
      const retrievedProducts = (data.products || []).map(p => ({
        name: p.facts?.name || p.identity?.name || 'Unknown',
        brand: p.facts?.brand || p.identity?.brand || 'Unknown',
        similarityScore: p.retrievalQuality?.score || p.semanticScore || null,
        fiber: p.facts?.nutrition?.fiber || p.nutrition?.fiber || null,
        sugar: p.facts?.nutrition?.sugar || p.nutrition?.sugar || null,
        protein: p.facts?.nutrition?.protein || p.nutrition?.protein || null,
        saturatedFat: p.facts?.nutrition?.saturatedFat || p.nutrition?.saturatedFat || null,
        smartChoiceScore: p.calculated?.smartChoice?.overallScore || null,
        preferenceMatch: p.calculated?.preferenceMatch || null
      }));

      auditResults.push({
        query: q,
        retrievedProducts,
        answer: data.answer || "NO ANSWER",
        rawProducts: data.products // keep to inspect secrets
      });

    } catch (e) {
      console.error(`Error querying "${q}":`, e.message);
      auditResults.push({ query: q, error: e.message });
    }
  }

  const outputPath = path.join(__dirname, 'rag_audit_results.json');
  fs.writeFileSync(outputPath, JSON.stringify(auditResults, null, 2));
  console.log(`Audit results saved to ${outputPath}`);
}

run();
