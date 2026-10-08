require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const Product = require('../backend/models/Product');
const UserPreference = require('../backend/models/UserPreference');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const total = await Product.countDocuments();
  
  // Find all products and check in memory to be 100% sure
  const products = await Product.find({}).lean();
  
  let validCount = 0;
  let invalidCount = 0;
  
  products.forEach(p => {
    if (p.embedding && Array.isArray(p.embedding.vector) && p.embedding.vector.length === 384 && !p.embedding.vector.some(v => typeof v !== 'number' || isNaN(v) || v === null)) {
      validCount++;
    } else {
      invalidCount++;
      console.log('Invalid embedding for:', p._id, p.identity.name);
    }
  });

  console.log('Total Products:', total);
  console.log('Valid 384-dim Embeddings:', validCount);
  console.log('Missing/Invalid Embeddings:', invalidCount);
  
  const prefCount = await UserPreference.countDocuments();
  console.log('UserPreference count:', prefCount);
  
  mongoose.connection.close();
}
run();
