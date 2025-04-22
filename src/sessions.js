const { Client, RemoteAuth } = require('whatsapp-web.js');
const mongoose = require('mongoose');
const { MongoStore } = require('wwebjs-mongo'); // MongoDB store for session management
const { logger } = require('./logger');
const { restoreSessions } = require('./sessions');
const { sessionFolderPath, chromeBin, headless } = require('./config');
const { waitForNestedObject } = require('./utils');

// Replace this with MongoDB connection string in .env
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/whatsapp_sessions';

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    logger.info('Connected to MongoDB for session storage');
  })
  .catch((err) => {
    logger.error('MongoDB connection error:', err);
    process.exit(1); // Exit if MongoDB connection fails
  });

// MongoDB store for session management
const store = new MongoStore({ mongoose: mongoose });

// Setup the RemoteAuth strategy with MongoDB
const setupSession = async (sessionId) => {
  try {
    if (sessions.has(sessionId)) {
      return { success: false, message: `Session already exists for: ${sessionId}`, client: sessions.get(sessionId) };
    }

    // Define client options for WhatsApp Web client
    const clientOptions = {
      puppeteer: {
        executablePath: chromeBin,
        headless,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      },
      authStrategy: new RemoteAuth({
        store: store, // Use MongoDB store for session management
        backupSyncIntervalMs: 300000 // Sync session data every 5 minutes (300000 ms)
      })
    };

    const client = new Client(clientOptions);

    try {
      await client.initialize();
    } catch (error) {
      logger.error({ sessionId, err: error }, 'Initialize error');
      throw error;
    }

    // Save the session to MongoDB store
    sessions.set(sessionId, client);

    return { success: true, message: 'Session initiated successfully', client };
  } catch (error) {
    return { success: false, message: error.message, client: null };
  }
};

// Function to restore sessions from MongoDB
const restoreSessions = () => {
  try {
    // Use MongoDB-based session management (no need to use file system logic)
    store.getAllSessions()  // Replace with appropriate MongoDB query to fetch all sessions
      .then((sessionsData) => {
        sessionsData.forEach((sessionData) => {
          setupSession(sessionData.sessionId);  // Restore each session
        });
      })
      .catch((err) => {
        logger.error('Failed to restore sessions from MongoDB', err);
      });
  } catch (error) {
    logger.error(error, 'Failed to restore sessions');
  }
};

module.exports = {
  sessions,
  setupSession,
  restoreSessions
};
