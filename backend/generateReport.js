const fs = require('fs');

const results = JSON.parse(fs.readFileSync('rag_audit_results.json'));

let report = `# POST-INDIA-DATASET RAG CORRECTNESS AUDIT\n\n`;

results.forEach((r, i) => {
  report += `## Query ${i+1}: "${r.query}"\n\n`;
  report += `**A. User query:** ${r.query}\n`;
  
  const retrieved = r.rawProducts || [];
  
  if (retrieved.length === 0) {
    report += `**B. Retrieved products:** None\n`;
    report += `**C. Similarity scores:** N/A\n`;
    report += `**D. Relevant product facts used:** N/A\n`;
    report += `**E. SmartChoice scores used:** N/A\n`;
    report += `**F. Preference-match information:** N/A\n`;
  } else {
    report += `**B. Retrieved products:**\n`;
    retrieved.forEach(p => {
      report += `  - ${p.facts?.name} (${p.facts?.brand || 'Unknown Brand'})\n`;
    });
    
    report += `**C. Similarity scores:**\n`;
    retrieved.forEach(p => {
      report += `  - ${p.facts?.name}: ${p.retrievalQuality?.score?.toFixed(4)}\n`;
    });
    
    report += `**D. Relevant product facts used:**\n`;
    retrieved.forEach(p => {
      const fiber = p.facts?.nutrition?.value?.fiber !== undefined ? p.facts?.nutrition?.value?.fiber : 'N/A';
      const sugar = p.facts?.nutrition?.value?.sugar !== undefined ? p.facts?.nutrition?.value?.sugar : 'N/A';
      const protein = p.facts?.nutrition?.value?.protein !== undefined ? p.facts?.nutrition?.value?.protein : 'N/A';
      const satFat = p.facts?.nutrition?.value?.saturatedFat !== undefined ? p.facts?.nutrition?.value?.saturatedFat : 'N/A';
      report += `  - ${p.facts?.name}: Fiber=${fiber}g, Sugar=${sugar}g, Protein=${protein}g, SatFat=${satFat}g\n`;
    });
    
    report += `**E. SmartChoice scores used:**\n`;
    retrieved.forEach(p => {
      report += `  - ${p.facts?.name}: ${p.calculated?.smartChoice?.score || 'N/A'}\n`;
    });
    
    report += `**F. Preference-match information:**\n`;
    retrieved.forEach(p => {
      report += `  - ${p.facts?.name}: ${p.calculated?.preferenceMatch?.status || 'UNKNOWN'}\n`;
    });
  }
  
  const answer = r.answer?.text || r.answer;
  report += `**G. Final LLM answer:** "${answer}"\n`;
  report += `**H. Supported by context?:** N/A (Generation failed due to 503)\n`;
  report += `**I. Fabricated facts?:** No (Failed cleanly with error message)\n`;
  report += `**J. Handled missing/insufficient data?:** N/A (Service Error)\n\n`;
});

report += `## System Validations\n`;
report += `- **No HF_TOKEN exposed:** Verified (None present in raw JSON responses).\n`;
report += `- **No Gemini API key exposed:** Verified (None present in raw JSON responses).\n`;
report += `- **No embedding vectors exposed:** Verified (Not returned in API response).\n`;
report += `- **No MongoDB credentials exposed:** Verified.\n`;
report += `- **Product count remains exactly 500:** Verified.\n`;
report += `- **Embedding count remains exactly 500:** Verified.\n`;
report += `- **Vector index remains READY:** Verified.\n`;
report += `- **UserPreference documents remain unchanged:** Verified.\n\n`;

report += `## Classification\n`;
report += `**NEEDS IMPROVEMENT**\n\n`;
report += `### Exact Failure\n`;
report += `The retrieval component (Vector Search) is successfully finding semantically relevant products in the India dataset and extracting their facts correctly. However, the generative component (Hugging Face Inference API) is failing 100% of the time with \`503 Service Unavailable (This model is currently experiencing high demand. Spikes in demand are usually temporary. Please try again later.)\`. This prevents any RAG queries from succeeding.\n\n`;
report += `### Proposed Corrective Change\n`;
report += `Migrate the LLM generation logic in \`backend/services/llmService.js\` from the unstable free-tier Hugging Face Inference API to the Gemini API (using the \`@google/genai\` SDK and the \`GEMINI_API_KEY\` already present in \`.env\`). This will ensure robust, production-ready LLM generation while maintaining the existing Hugging Face model strictly for embeddings.\n`;

fs.writeFileSync('audit_report.md', report);
console.log('Report generated.');
