const app = require('./src/app');
const { baseWebhookURL, enableWebHook, enableWebSocket } = require('./src/config');
const { logger } = require('./src/logger');
const { handleUpgrade } = require('./src/websocket');
const { MongoDBSessionStore } = require('wwebjs-mongo'); // Import wwebjs-mongo
const mongoose = require('mongoose');
const { Client, LocalAuth } = require('whatsapp-web.js'); // Import WhatsApp Web client

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

// Set up the session store using wwebjs-mongo
const store = new MongoDBSessionStore(mongoose.connection);

// Initialize WhatsApp Web client with session store
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true }, // You can adjust the puppeteer settings if needed
  session: store,  // Use the MongoDB session store
});

// Handle client ready event
client.on('ready', () => {
  logger.info('WhatsApp Web client is ready!');
});

// Start the WhatsApp Web client
client.initialize();

// Start the server
const port = process.env.PORT || 3000;

// Check if BASE_WEBHOOK_URL environment variable is available when WebHook is enabled
if (!baseWebhookURL && enableWebHook) {
  logger.error('BASE_WEBHOOK_URL environment variable is not set. Exiting...');
  process.exit(1); // Terminate the application with an error code
}

const server = app.listen(port, () => {
  logger.info(`Server running on port ${port}`);
});

// WebSocket upgrade handling if enabled
if (enableWebSocket) {
  server.on('upgrade', (request, socket, head) => {
    handleUpgrade(request, socket, head);
  });
}

// puppeteer uses subscriptions to SIGINT, SIGTERM, and SIGHUP to know when to close browser instances
// this disables the warnings when you start more than 10 browser instances
process.setMaxListeners(0);
