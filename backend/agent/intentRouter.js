const { GoogleGenAI, Type } = require('@google/genai');
const { executeWithRetry } = require('../utils/geminiErrorHandler');

const INTENT_ENUM = [
  'PRODUCT_COMPARISON',
  'GLOBAL_PRODUCT_QUERY',
  'BARCODE_LOOKUP',
  'VISION_EXTRACTION',
  'FSSAI_ANALYSIS',
  'PRODUCT_SEARCH',
  'SIMILAR_PRODUCT_SEARCH',
  'RECOMMENDATION',
  'NUTRITION_ANALYSIS',
  'FOLLOW_UP',
  'GENERAL_PRODUCT_QA',
  'GENERAL_CHAT'
];

class IntentRouter {
  constructor() {
    this.ai = null;
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  }

  initAi() {
    if (!this.ai && process.env.GEMINI_API_KEY) {
      this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
  }

  async routeIntent(message, sessionContext) {
    this.initAi();
    if (!this.ai) {
      throw new Error("GEMINI_API_KEY is not configured for intent routing.");
    }

    const systemPrompt = `
      You are an Intent Router for the SmartChoice AI Assistant.
      Analyze the user's message and the conversation context.
      Categorize the intent strictly into one of the allowed categories.
      
      RULES:
      - If the user asks for the top 5, highest, lowest, or a metric globally (e.g. "Which product has the highest protein?"), use GLOBAL_PRODUCT_QUERY.
      - If the user asks to compare specific products (e.g. "Compare A and B"), use PRODUCT_COMPARISON.
      - If the user asks a follow-up question referencing the active comparison implicitly (e.g. "Which of them has more protein?", "Remove the second one"), use FOLLOW_UP.
      - If the user asks if ingredients are safe or mentions FSSAI, use FSSAI_ANALYSIS.
      - If the user uploads a barcode, use BARCODE_LOOKUP.
      - If the user uploads an image/PDF, use VISION_EXTRACTION.
      - If the user asks for similar products or healthier alternatives, use SIMILAR_PRODUCT_SEARCH (RAG).
      - If the user asks for a recommendation, use RECOMMENDATION.
      - If the user asks general food/health questions, use GENERAL_CHAT.
    `;

    const prompt = `
      User Message: "${message}"
      
      Context:
      Active Comparison Products: ${sessionContext.activeComparisonList?.length || 0}
      Recent Conversation History: ${JSON.stringify(sessionContext.conversation?.messages?.slice(-3) || [])}
    `;

    let response;
    try {
      response = await executeWithRetry(() => this.ai.models.generateContent({
        model: this.modelName,
        contents: prompt,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.0,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              intent: {
                type: Type.STRING,
                description: "The strictly classified intent.",
                enum: INTENT_ENUM
              },
              confidence: {
                type: Type.NUMBER,
                description: "Confidence score between 0.0 and 1.0"
              },
              requiresTools: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of mapped tools required. Must strictly be from: 'global_product_query', 'barcode_resolver', 'vision_extractor', 'fssai_compliance_checker'."
              },
              extractedParameters: {
                type: Type.OBJECT,
                description: "Any structured data parsed from the prompt, e.g. metric='protein', direction='desc' for GLOBAL_PRODUCT_QUERY. Leave empty if none.",
                properties: {
                  metric: { type: Type.STRING },
                  direction: { type: Type.STRING },
                  limit: { type: Type.NUMBER }
                }
              }
            },
            required: ["intent", "confidence", "requiresTools"]
          }
        }
      }));
      const parsedResult = JSON.parse(response.text);
      return parsedResult;
    } catch (error) {
      console.error("[Intent Router Error]", error.message || error.type || error);
      // Safe fallback
      return {
        intent: 'GENERAL_CHAT',
        confidence: 0.1,
        requiresTools: [],
        error: error.type || error.message || 'Unknown error'
      };
    }
  }
}
module.exports = new IntentRouter();
