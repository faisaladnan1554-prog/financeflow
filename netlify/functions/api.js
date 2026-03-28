/**
 * Netlify Serverless Function — wraps the Express app.
 *
 * Netlify redirect:  /api/*  →  /.netlify/functions/api/:splat
 * So Express receives paths like /auth/login, /accounts, etc.
 *
 * MongoDB connection is cached across warm invocations.
 */
const serverless = require('serverless-http');
const mongoose = require('mongoose');

// Import the Express app (routes mounted at / level)
const app = require('../../server/app');

// Cache connection across Lambda warm starts
let isConnected = false;

const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Prevent function from waiting for open MongoDB connections to close
  context.callbackWaitsForEmptyEventLoop = false;

  if (!isConnected) {
    try {
      await mongoose.connect(process.env.MONGODB_URI);
      isConnected = true;
      console.log('✅ MongoDB connected (serverless)');
    } catch (err) {
      console.error('❌ MongoDB connection failed:', err.message);
      return {
        statusCode: 503,
        body: JSON.stringify({ error: 'Database connection failed' }),
        headers: { 'Content-Type': 'application/json' },
      };
    }
  }

  return handler(event, context);
};
