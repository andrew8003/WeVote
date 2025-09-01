const { MongoClient } = require('mongodb');
require('dotenv').config();

class DatabaseConnection {
  constructor() {
    this.client = null;
    this.db = null;
  }

  async connect() {
    try {
      if (!this.client) {
        const uri = process.env.MONGODB_URI;
        if (!uri) {
          throw new Error('MONGODB_URI not found in environment variables');
        }

        this.client = new MongoClient(uri, {
          useUnifiedTopology: true,
        });

        await this.client.connect();
        this.db = this.client.db(process.env.DB_NAME || 'wevote');
        
        console.log('Connected to MongoDB Atlas successfully');
      }
      return this.db;
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      console.log('Disconnected from MongoDB');
    }
  }

  getDb() {
    if (!this.db) {
      throw new Error('Database not connected. Call connect() first.');
    }
    return this.db;
  }

  // Get voters collection (personal information)
  getVotersCollection() {
    return this.getDb().collection('voters');
  }

  // Get voter authentication collection (auth data)
  getVoterAuthCollection() {
    return this.getDb().collection('voter_auth');
  }

  // Get candidates collection
  getCandidatesCollection() {
    return this.getDb().collection('candidates');
  }

  // Get cast votes collection (anonymous vote records)
  getCastVotesCollection() {
    return this.getDb().collection('cast_votes');
  }

  // Get admin collection
  getAdminCollection() {
    return this.getDb().collection('admin');
  }
}

const dbConnection = new DatabaseConnection();

module.exports = dbConnection;
