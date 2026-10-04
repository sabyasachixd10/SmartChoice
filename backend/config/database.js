const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    if (!process.env.MONGODB_URI) {
      console.warn("MONGODB_URI is not defined in environment variables. Database features will be unavailable.");
      return;
    }
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000 // Don't hang forever
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    
    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected. Attempting to reconnect...');
    });
    
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
    });

  } catch (error) {
    console.error(`Error configuring MongoDB: ${error.message}`);
    console.warn("Continuing without database connection for development purposes.");
    // Do not crash the server if DB is unavailable, allow health checks to pass.
  }
};

module.exports = connectDB;
