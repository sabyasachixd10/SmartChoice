require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Product = require('../backend/models/Product');
const UserPreference = require('../backend/models/UserPreference');

const backupDir = path.join(__dirname, '../data/backups');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

async function run() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    
    // STEP 1 - BACKUP
    console.log('Creating backup...');
    const existingProducts = await Product.find({}).lean();
    const backupPath = path.join(backupDir, `products_before_india_replacement_${Date.now()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(existingProducts, null, 2));
    console.log(`Backup created at: ${backupPath}`);
    console.log(`Backup product count: ${existingProducts.length}`);
    if (existingProducts.length === 0) {
      throw new Error('Backup failed or 0 products found. Aborting.');
    }
    
    // STEP 2 - REPLACEMENT
    const newProducts = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/processed/products_india.json'), 'utf8'));
    console.log(`Loading ${newProducts.length} new products from data/processed/products_india.json`);
    
    console.log('Deleting existing products...');
    const deleteResult = await Product.deleteMany({});
    console.log(`Products removed: ${deleteResult.deletedCount}`);
    
    console.log('Inserting new products...');
    const insertResult = await Product.insertMany(newProducts);
    console.log(`Products inserted: ${insertResult.length}`);
    
    // STEP 3 - VERIFY
    const finalCount = await Product.countDocuments();
    console.log(`Final MongoDB product count: ${finalCount}`);
    
    const duplicateCheck = await Product.aggregate([
      { $group: { _id: "$identity.barcode", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    console.log(`Duplicate barcode count: ${duplicateCheck.length}`);
    
    const indiaCount = await Product.countDocuments({ "identity.countries": { $regex: /india/i } });
    console.log(`India-tag validation (count matching india): ${indiaCount}`);
    
    // Check user preferences
    const upCount = await UserPreference.countDocuments();
    console.log(`UserPreference collection status: ${upCount} documents remain`);
    
  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    mongoose.connection.close();
  }
}

run();
