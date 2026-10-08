const mongoose = require('mongoose');

const agentSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  
  // Conversation state
  conversation: {
    messages: [{
      role: { type: String, enum: ['user', 'ai', 'system', 'tool'] },
      content: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} }
  },
  
  // Comparison state
  activeComparisonList: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    barcode: { type: String },
    name: { type: String },
    brand: { type: String },
    nutrition: { type: mongoose.Schema.Types.Mixed },
    ingredients: { type: mongoose.Schema.Types.Mixed },
    processing: { type: mongoose.Schema.Types.Mixed },
    smartChoiceScore: { type: Number },
    source: { type: String },
    validationStatus: { type: mongoose.Schema.Types.Mixed }
  }],
  
  // Retrieval state
  retrievedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  
  // Input state
  inputState: {
    uploadedDocuments: [{ type: mongoose.Schema.Types.Mixed }],
    barcodeResults: [{ type: String }]
  },
  
  // User state
  userPreferences: { type: mongoose.Schema.Types.Mixed },
  
  // Validation state
  validationWarnings: [{ type: String }],
  
  // Tool/Intent state
  lastIntent: { type: String },
  lastToolResults: { type: mongoose.Schema.Types.Mixed },
  
  // TTL
  expiresAt: { type: Date, default: () => Date.now() + 24 * 60 * 60 * 1000 }
}, {
  timestamps: true
});

agentSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AgentSession', agentSessionSchema);
