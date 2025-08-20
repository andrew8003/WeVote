const express = require('express');
const dbConnection = require('../utils/database');
const router = express.Router();

// Database-based admin authentication middleware
const adminAuth = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    
    console.log('Admin auth attempt:', { username, password: password ? 'PROVIDED' : 'MISSING' });
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Connect to database and get admin collection
    const db = await dbConnection.connect();
    const adminCollection = dbConnection.getAdminCollection();
    
    console.log('Looking for admin user in database...');
    
    // Find admin user in database
    const adminUser = await adminCollection.findOne({ 
      username: username,
      password: password,
      isActive: true
    });

    console.log('Admin user found:', adminUser ? 'YES' : 'NO');

    if (adminUser) {
      // Admin authenticated successfully
      req.adminUser = adminUser;
      console.log('Admin authentication successful');
      next();
    } else {
      console.log('Admin authentication failed - user not found or inactive');
      return res.status(401).json({ error: 'Invalid admin credentials' });
    }
  } catch (error) {
    console.error('Admin authentication error:', error);
    return res.status(500).json({ error: 'Authentication system error' });
  }
};

// Admin login endpoint
router.post('/login', adminAuth, (req, res) => {
  res.json({ 
    success: true, 
    message: 'Admin authenticated successfully',
    token: 'admin-authenticated',
    user: {
      username: req.adminUser.username,
      role: req.adminUser.role
    }
  });
});

// Setup admin user endpoint (for initial setup only)
router.post('/setup', async (req, res) => {
  try {
    console.log('Admin setup endpoint called');
    const db = await dbConnection.connect();
    const adminCollection = dbConnection.getAdminCollection();
    
    // Check if admin user already exists
    const existingAdmin = await adminCollection.findOne({ username: 'admin' });
    
    console.log('Existing admin found:', existingAdmin ? 'YES' : 'NO');
    
    if (existingAdmin) {
      return res.json({ 
        success: false, 
        message: 'Admin user already exists' 
      });
    }

    // Create admin user
    const adminUser = {
      username: 'admin',
      password: 'admin',
      role: 'administrator',
      createdAt: new Date(),
      isActive: true
    };

    const result = await adminCollection.insertOne(adminUser);
    console.log('Admin user created:', result.insertedId);

    res.json({ 
      success: true, 
      message: 'Admin user created successfully' 
    });
  } catch (error) {
    console.error('Error setting up admin user:', error);
    res.status(500).json({ error: 'Failed to setup admin user' });
  }
});

// Get comprehensive voting statistics
router.post('/stats', adminAuth, async (req, res) => {
  try {
    const db = await dbConnection.connect();
    const votersCollection = dbConnection.getVotersCollection();
    const castVotesCollection = dbConnection.getCastVotesCollection();

    // Get all registered voters
    const allVoters = await votersCollection.find({}).toArray();
    const totalRegistered = allVoters.length;
    
    // Get all cast votes to count actual votes
    const allCastVotes = await castVotesCollection.find({}).toArray();
    const totalVotesCast = allCastVotes.length;

    // Get voters who have cast votes (for voter tracking)
    const votersWhoCast = await votersCollection.find({ voteCast: true }).toArray();

    // Group votes by constituency (area)
    const votesByConstituency = {};
    const candidateVotes = {};

    allCastVotes.forEach(vote => {
      const constituency = vote.constituency;
      const candidateId = vote.candidateId;
      const voteType = vote.voteType;

      // Initialize constituency if not exists
      if (!votesByConstituency[constituency]) {
        votesByConstituency[constituency] = {
          constituency: constituency,
          totalVotes: 0,
          mpVotes: {},
          councilVotes: {}
        };
      }

      // Count votes by type and candidate
      if (voteType === 'MP') {
        if (!votesByConstituency[constituency].mpVotes[candidateId]) {
          votesByConstituency[constituency].mpVotes[candidateId] = 0;
        }
        votesByConstituency[constituency].mpVotes[candidateId]++;
      } else if (voteType === 'LOCAL_COUNCIL') {
        if (!votesByConstituency[constituency].councilVotes[candidateId]) {
          votesByConstituency[constituency].councilVotes[candidateId] = 0;
        }
        votesByConstituency[constituency].councilVotes[candidateId]++;
      }

      // Overall candidate vote tracking
      if (!candidateVotes[candidateId]) {
        candidateVotes[candidateId] = {
          candidateId: candidateId,
          voteType: voteType,
          totalVotes: 0,
          constituencies: {}
        };
      }
      candidateVotes[candidateId].totalVotes++;
      
      if (!candidateVotes[candidateId].constituencies[constituency]) {
        candidateVotes[candidateId].constituencies[constituency] = 0;
      }
      candidateVotes[candidateId].constituencies[constituency]++;
    });

    // Calculate total votes per constituency
    Object.keys(votesByConstituency).forEach(constituency => {
      const mpVoteCount = Object.values(votesByConstituency[constituency].mpVotes).reduce((sum, count) => sum + count, 0);
      const councilVoteCount = Object.values(votesByConstituency[constituency].councilVotes).reduce((sum, count) => sum + count, 0);
      votesByConstituency[constituency].totalVotes = mpVoteCount + councilVoteCount;
      votesByConstituency[constituency].mpVoteCount = mpVoteCount;
      votesByConstituency[constituency].councilVoteCount = councilVoteCount;
    });

    // Get voter registration by constituency and actual votes cast
    const votersByConstituency = {};
    const votersWhoVotedByConstituency = new Set();

    // Count registered voters by constituency
    allVoters.forEach(voter => {
      // Extract constituency from postcode (first 3 digits)
      const postcode = voter.postcode || '';
      const constituency = postcode.length >= 3 ? postcode.substring(0, 3) : 'Unknown';
      
      if (!votersByConstituency[constituency]) {
        votersByConstituency[constituency] = {
          constituency: constituency,
          totalRegistered: 0,
          totalVoted: 0,
          turnoutPercentage: 0
        };
      }
      
      votersByConstituency[constituency].totalRegistered++;
    });

    // Count unique voters who actually cast votes by constituency
    allCastVotes.forEach(vote => {
      const constituency = vote.constituency;
      const voterId = vote.voterId;
      
      // Create unique key for voter in constituency
      const voterConstituencyKey = `${voterId}-${constituency}`;
      
      if (!votersWhoVotedByConstituency.has(voterConstituencyKey)) {
        votersWhoVotedByConstituency.add(voterConstituencyKey);
        
        // Initialize constituency if needed
        if (!votersByConstituency[constituency]) {
          votersByConstituency[constituency] = {
            constituency: constituency,
            totalRegistered: 0,
            totalVoted: 0,
            turnoutPercentage: 0
          };
        }
        
        votersByConstituency[constituency].totalVoted++;
      }
    });

    // Calculate turnout percentages
    Object.keys(votersByConstituency).forEach(constituency => {
      const stats = votersByConstituency[constituency];
      stats.turnoutPercentage = stats.totalRegistered > 0 
        ? Math.round((stats.totalVoted / stats.totalRegistered) * 100) 
        : 0;
    });

    // Count unique voters who cast at least one vote
    const uniqueVotersWhoCast = new Set(allCastVotes.map(vote => vote.voterId));
    const totalVotersTurnout = uniqueVotersWhoCast.size;

    // Overall statistics
    const overallStats = {
      totalRegisteredVoters: totalRegistered,
      totalVotesCast: totalVotesCast, // Total individual votes (MP + Council)
      totalVotersTurnout: totalVotersTurnout, // Unique voters who cast at least one vote
      overallTurnoutPercentage: totalRegistered > 0 ? Math.round((totalVotersTurnout / totalRegistered) * 100) : 0,
      totalConstituencies: Object.keys(votesByConstituency).length
    };

    res.json({
      success: true,
      overallStats,
      votesByConstituency: Object.values(votesByConstituency),
      votersByConstituency: Object.values(votersByConstituency),
      candidateVotes: Object.values(candidateVotes),
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({ error: 'Failed to fetch voting statistics' });
  }
});

// Get detailed voter list (for admin purposes)
router.post('/voters', adminAuth, async (req, res) => {
  try {
    const db = await dbConnection.connect();
    const votersCollection = dbConnection.getVotersCollection();

    const voters = await votersCollection.find({}, {
      projection: {
        voterId: 1,
        firstName: 1,
        lastName: 1,
        postcode: 1,
        voteCast: 1,
        registrationDate: 1,
        voteTimestamp: 1,
        // Don't include encrypted National Insurance for security
        nationalInsuranceEncrypted: 0,
        nationalInsuranceIV: 0
      }
    }).toArray();

    // Add constituency info based on postcode
    const votersWithConstituency = voters.map(voter => ({
      ...voter,
      constituency: voter.postcode ? voter.postcode.substring(0, 3) : 'Unknown',
      name: `${voter.firstName} ${voter.lastName}`
    }));

    res.json({
      success: true,
      voters: votersWithConstituency,
      totalCount: voters.length
    });

  } catch (error) {
    console.error('Error fetching voter list:', error);
    res.status(500).json({ error: 'Failed to fetch voter information' });
  }
});

module.exports = router;
