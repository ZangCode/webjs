const app = require('./src/app');
const { baseWebhookURL, enableWebHook, enableWebSocket } = require('./src/config');
const { logger } = require('./src/logger');
const { handleUpgrade } = require('./src/websocket');
const { MongoStore } = require('wwebjs-mongo'); // Correctly import MongoStore
const mongoose = require('mongoose');
const { Client, RemoteAuth } = require('whatsapp-web.js'); // Import WhatsApp Web client and RemoteAuth

require('dotenv').config();

// MongoDB URI for session storage
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp_sessions'; // Use the Mongo URI from environment or default to localhost

// Connect to MongoDB for session storage
mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    logger.info('Connected to MongoDB for session storage');
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1); // Exit if MongoDB connection fails
  });

// Create MongoStore instance for session management
const store = new MongoStore({ mongoose: mongoose }); // Use MongoStore to manage sessions

// Set up WhatsApp Web client with RemoteAuth strategy and MongoDB session store
const client = new Client({
  authStrategy: new RemoteAuth({
    store: store, // Use MongoDB store for session management
    backupSyncIntervalMs: 300000 // Sync session data every 5 minutes (300000 ms)
  }),
  puppeteer: { headless: true }, // Set to true for headless mode
});

// Handle client ready event
client.on('ready', () => {
  logger.info('WhatsApp Web client is ready!');
});

// Initialize the client
client.initialize();

// Optionally, you can start your server here if needed
// const port = process.env.PORT || 3000;
// const server = app.listen(port, () => {
//   logger.info(`Server running on port ${port}`);
// });
