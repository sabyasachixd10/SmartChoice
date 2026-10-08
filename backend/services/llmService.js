const { GoogleGenAI } = require('@google/genai');
const { executeWithRetry } = require('../utils/geminiErrorHandler');

class LlmService {
  constructor() {
    this.ai = null;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  initAi() {
    if (!this.ai && process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  getSystemPrompt() {
    return `You are a SmartChoice AI assistant. You answer user queries strictly based on the provided retrieved RAG context.
    
CRITICAL GROUNDING RULES:
1. ONLY use information explicitly present in the provided JSON context. Do not invent product information, ingredients, missing nutrition values, allergens, additives, or brands.
2. If the context indicates "hasSufficientEvidence": false or you cannot find enough information to answer reliably, explain that the current catalog does not contain enough reliable information to answer fully. Do not fabricate an answer.
3. Distinguish Open Food Facts/product facts from calculated SmartChoice metrics.
4. Distinguish semantic similarity score from SmartChoice Score. Do not confuse them.
5. SmartChoice Score is NOT a medical or clinical score. Do not provide medical diagnosis or treatment.
6. Only refer to products that are explicitly provided in the context. Do not claim a product is in the catalog if it is not retrieved.
7. Use cautious language when evidence is incomplete. Avoid unsupported claims such as "this product is definitely healthy."
8. Prioritize factual accuracy over fluency.
9. When answering comparison questions, use only the nutrition/scores from the context. Clearly identify SmartChoice Scores as calculated scores.`;
  }

  async generateAnswer(query, ragContext) {
    this.initAi();
    
    if (!this.ai) {
      throw { type: 'GEMINI_AUTH_ERROR', message: "GEMINI_API_KEY is not configured." };
    }

    const hasSufficientEvidence = ragContext.retrieval?.hasSufficientEvidence;
    
    // Determine confidence based on RAG context
    let confidence = "low";
    if (hasSufficientEvidence) {
      if (ragContext.retrieval?.hasStrongEvidence) {
        confidence = "high";
      } else {
        confidence = "medium";
      }
    } else {
      confidence = "insufficient";
    }

    let textAnswer = "";

    try {
      const prompt = `User Query: "${query}"\n\nRetrieved Context:\n${JSON.stringify(ragContext, null, 2)}`;
      
      const response = await executeWithRetry(() => this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: this.getSystemPrompt(),
          temperature: 0.1
        }
      }));
      
      textAnswer = response.text;
    } catch (error) {
      console.error("[LLM Service Error]", error.message || error.type || error);
      throw error; // Let the controller handle it and return a structured error
    }

    return {
      text: textAnswer,
      grounded: true,
      confidence: confidence,
      evidence: {
        productsUsed: ragContext.products.map(p => p.id),
        retrievalQuality: confidence
      }
    };
  }
}

module.exports = new LlmService();
