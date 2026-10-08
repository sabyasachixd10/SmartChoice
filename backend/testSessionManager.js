const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const connectDB = require('./config/database');
const sessionManager = require('./services/sessionManager');
const Product = require('./models/Product');
const AgentSession = require('./models/AgentSession');

const testSessionManager = async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB.');

    // Cleanup previous test sessions
    await AgentSession.deleteMany({ sessionId: { $regex: /^test_session_/ } });

    const sessionId = 'test_session_' + Date.now();
    console.log(`\n--- Starting tests for session: ${sessionId} ---`);

    // 1 & 2. New session & Existing session retrieval
    console.log('\nTesting session creation and retrieval...');
    let session = await sessionManager.getOrCreateSession(sessionId);
    console.log('1. Session created:', session.sessionId === sessionId ? 'PASS' : 'FAIL');
    
    let existingSession = await sessionManager.getOrCreateSession(sessionId);
    console.log('2. Session retrieved correctly:', existingSession._id.toString() === session._id.toString() ? 'PASS' : 'FAIL');

    // 9. Conversation state update
    console.log('\nTesting conversation state update...');
    session = await sessionManager.addMessage(sessionId, 'user', 'Compare Product A and Product B.');
    console.log('9. User message added:', session.conversation.messages.length === 1 && session.conversation.messages[0].role === 'user' ? 'PASS' : 'FAIL');

    // 3, 4, 5. Product operations
    console.log('\nTesting active comparison list operations...');
    const products = await Product.find().limit(3);
    if (products.length < 3) {
      console.log('Not enough products in DB to run comparison tests.');
      process.exit(1);
    }

    // 3. Add one product
    session = await sessionManager.addProductToComparison(sessionId, products[0]);
    console.log('3. Add one product:', session.activeComparisonList.length === 1 ? 'PASS' : 'FAIL');

    // 4. Add multiple products
    session = await sessionManager.addProductToComparison(sessionId, products[1]);
    console.log('4. Add multiple products:', session.activeComparisonList.length === 2 ? 'PASS' : 'FAIL');

    // 5. Duplicate product rejection
    try {
      await sessionManager.addProductToComparison(sessionId, products[0]);
      console.log('5. Duplicate product handling: FAIL (Did not throw)');
    } catch (err) {
      console.log('5. Duplicate product handling: PASS (Threw expected error: ' + err.message + ')');
    }

    // 6. Remove product
    session = await sessionManager.removeProductFromComparison(sessionId, products[0]._id.toString());
    console.log('6. Remove product:', session.activeComparisonList.length === 1 && session.activeComparisonList[0].productId.toString() === products[1]._id.toString() ? 'PASS' : 'FAIL');

    // 7. Clear comparison
    session = await sessionManager.clearComparison(sessionId);
    console.log('7. Clear comparison:', session.activeComparisonList.length === 0 ? 'PASS' : 'FAIL');

    // 10. Validation warning storage
    console.log('\nTesting validation warnings...');
    session = await sessionManager.addValidationWarning(sessionId, 'Missing nutrition data for product C');
    console.log('10. Validation warning storage:', session.validationWarnings.includes('Missing nutrition data for product C') ? 'PASS' : 'FAIL');

    // 8. Session persistence check (re-fetching from DB)
    console.log('\nTesting session persistence...');
    const refetchedSession = await AgentSession.findOne({ sessionId });
    console.log('8. Session persistence:', refetchedSession && refetchedSession.conversation.messages.length > 0 ? 'PASS' : 'FAIL');

    // Testing conversational context follow-up sync logic
    console.log('\nTesting follow-up RAG query logic (syncing active list)...');
    // Simulate what ragController does
    const activeProductIds = [products[0]._id.toString(), products[2]._id.toString()];
    
    // Clear and Add active comparison from frontend
    await sessionManager.clearComparison(sessionId);
    for (const pid of activeProductIds) {
      const p = await Product.findById(pid);
      if (p) await sessionManager.addProductToComparison(sessionId, p);
    }
    
    await sessionManager.addMessage(sessionId, 'user', 'Which has more protein?');
    const finalSession = await sessionManager.getOrCreateSession(sessionId);
    
    const hasSameList = finalSession.activeComparisonList.length === 2 && finalSession.conversation.messages.length === 2;
    console.log('11. Follow-up state retrieval (activeComparisonList synced):', hasSameList ? 'PASS' : 'FAIL');

    console.log('\nAll tests completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
};

testSessionManager();
