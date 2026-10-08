const mongoose = require('mongoose');

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn("MONGODB_URI is not defined in environment variables. Database features will be unavailable.");
    return;
  }
  
  if (mongoose.connection.readyState === 1) {
    return;
  }

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 15000
      });
      console.log(`MongoDB Connected: ${conn.connection.host}`);
      
      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
      });
      
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err.message);
      });

      return;
    } catch (error) {
      console.warn(`[Attempt ${attempt}/3] MongoDB Connection Error: ${error.message}`);
      if (attempt === 3) {
        console.error(`Failed to connect to MongoDB Atlas after 3 attempts.`);
        throw error;
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
};

module.exports = connectDB;
