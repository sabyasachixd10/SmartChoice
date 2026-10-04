const { HfInference } = require('@huggingface/inference');

class EmbeddingService {
  constructor() {
    this.model = process.env.HUGGINGFACE_EMBEDDING_MODEL || 'sentence-transformers/all-MiniLM-L6-v2';
    this.apiKey = process.env.HUGGINGFACE_API_KEY;
    this.hf = this.apiKey ? new HfInference(this.apiKey) : null;
  }

  /**
   * Generates an embedding vector for a single text string.
   * @param {string} text - The input text
   * @returns {Promise<number[]>} - The embedding vector
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      throw new Error('Embedding input text must be a non-empty string.');
    }

    if (!this.hf) {
      throw new Error('HUGGINGFACE_API_KEY is not configured in environment variables.');
    }

    try {
      const output = await this.hf.featureExtraction({
        model: this.model,
        inputs: text.trim()
      });

      const vector = this._extractVector(output);
      if (!vector || !Array.isArray(vector) || vector.length === 0) {
        throw new Error('Invalid vector response from Hugging Face.');
      }
      return vector;
    } catch (error) {
      this._handleError(error);
    }
  }

  /**
   * Generates embeddings for an array of texts.
   * @param {string[]} texts - Array of input texts
   * @returns {Promise<number[][]>} - Array of embedding vectors
   */
  async generateEmbeddings(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      throw new Error('Embedding input texts must be a non-empty array.');
    }

    const validTexts = texts.map(t => typeof t === 'string' ? t.trim() : '').filter(t => t.length > 0);
    
    if (validTexts.length === 0) {
      throw new Error('No valid text strings provided for embeddings.');
    }

    if (!this.hf) {
      throw new Error('HUGGINGFACE_API_KEY is not configured in environment variables.');
    }

    try {
      const output = await this.hf.featureExtraction({
        model: this.model,
        inputs: validTexts
      });

      // Response for multiple texts should be an array of vectors
      if (!Array.isArray(output)) {
        throw new Error('Invalid batch vector response from Hugging Face.');
      }

      const vectors = Array.isArray(output[0]) && Array.isArray(output[0][0])
        ? output.map(this._extractVector) 
        : (Array.isArray(output[0]) ? output : [output]); 

      return vectors;
    } catch (error) {
      this._handleError(error);
    }
  }

  _extractVector(data) {
    if (Array.isArray(data)) {
      if (Array.isArray(data[0])) {
        // If it's a 2D array, get the first token or pool depending on the model.
        // For sentence-transformers, it usually returns [1, hidden_size] or 1D array.
        return data[0]; 
      }
      return data; // 1D array
    }
    return null;
  }

  _handleError(error) {
    throw new Error(`Hugging Face API Error: ${error.message}`);
  }
}

module.exports = new EmbeddingService();
