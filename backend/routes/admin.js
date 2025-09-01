const express = require('express');
const dbConnection = require('../utils/database');
const router = express.Router();

// Database-based admin authentication 
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

// Setup admin user endpoint for initial setup ( unfinished )
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

// Get voting statistics
router.post('/stats', adminAuth, async (req, res) => {
  try {
    const db = await dbConnection.connect();
    const votersCollection = dbConnection.getVotersCollection();
    const castVotesCollection = dbConnection.getCastVotesCollection();
    const candidatesCollection = db.collection('candidates');

    // Get all candidates for name lookup
    const allCandidates = await candidatesCollection.find({}).toArray();
    const candidateMap = {};
    allCandidates.forEach(candidate => {
      candidateMap[candidate.candidateId] = {
        name: candidate.name, 
        party: candidate.party
      };
    });

    console.log('Candidate map created:', Object.keys(candidateMap).length, 'candidates loaded');

    // Get all registered voters
    const allVoters = await votersCollection.find({}).toArray();
    const totalRegistered = allVoters.length;
    
    // Get voters who have actually cast votes using voteCast field
    const votersWhoVoted = await votersCollection.find({ voteCast: true }).toArray();
    const totalVotersTurnout = votersWhoVoted.length;

    // Get all cast votes to count individual votes
    const allCastVotes = await castVotesCollection.find({}).toArray();
    const totalVotesCast = allCastVotes.length;

    // Group votes by constituency and by party
    const votesByConstituency = {};
    const candidateVotes = {};
    const mpVotesByParty = {};
    const councilVotesByParty = {};
    let totalMpVotes = 0;
    let totalCouncilVotes = 0;

    allCastVotes.forEach(vote => {
      // Use constituency directly from the vote record
      let constituency = vote.constituency;
      
      // If constituency not in vote record, try to find it from voter
      if (!constituency && vote.voterId) {
        const voter = allVoters.find(v => v._id && v._id.toString() === vote.voterId);
        if (voter && voter.postcode) {
          constituency = voter.postcode.substring(0, 3);
        }
      }

      // error handling if constituency isnt available
      if (!constituency) {
        constituency = 'Unknown';
      }

      const candidateId = vote.candidateId;
      const voteType = vote.voteType || vote.race; // different field names
      const candidateInfo = candidateMap[candidateId];
      const party = candidateInfo ? candidateInfo.party : 'Unknown Party';

      console.log(`Processing vote: constituency=${constituency}, candidateId=${candidateId}, voteType=${voteType}, race=${vote.race}, party=${party}`);

      // Initialize constituency if not already existing
      if (!votesByConstituency[constituency]) {
        votesByConstituency[constituency] = {
          constituency: constituency
        };
      }

      // Count votes by party for MP and Council races
      if (voteType === 'memberOfParliament') {
        if (!mpVotesByParty[party]) {
          mpVotesByParty[party] = 0;
        }
        mpVotesByParty[party]++;
        totalMpVotes++;
        console.log(`MP vote counted for party ${party}`);
      } else if (voteType === 'localCouncil') {
        if (!councilVotesByParty[party]) {
          councilVotesByParty[party] = 0;
        }
        councilVotesByParty[party]++;
        totalCouncilVotes++;
        console.log(`Council vote counted for party ${party}`);
      } else {
        console.log(`Unknown vote type: ${voteType} for vote ${vote._id}`);
      }

      // Overall candidate vote tracking
      if (!candidateVotes[candidateId]) {
        const candidateInfo = candidateMap[candidateId];
        candidateVotes[candidateId] = {
          candidateId: candidateId,
          candidateName: candidateInfo ? candidateInfo.name : 'Unknown Candidate',
          party: candidateInfo ? candidateInfo.party : 'Unknown Party',
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

    // Create party vote summaries with percentages
    const mpPartyVotes = Object.keys(mpVotesByParty).map(party => ({
      party: party,
      totalVotes: mpVotesByParty[party],
      percentage: totalMpVotes > 0 ? Math.round((mpVotesByParty[party] / totalMpVotes) * 100) : 0
    })).sort((a, b) => b.totalVotes - a.totalVotes);

    const councilPartyVotes = Object.keys(councilVotesByParty).map(party => ({
      party: party,
      totalVotes: councilVotesByParty[party],
      percentage: totalCouncilVotes > 0 ? Math.round((councilVotesByParty[party] / totalCouncilVotes) * 100) : 0
    })).sort((a, b) => b.totalVotes - a.totalVotes);

    // Debug output
    // console.log('MP votes by party:', mpVotesByParty);
    // console.log('Council votes by party:', councilVotesByParty);
    // console.log('Total MP votes:', totalMpVotes);
    // console.log('Total Council votes:', totalCouncilVotes);

    // Get voter registration by constituency using voteCast field
    const votersByConstituency = {};
    
    // Count registered voters and voters who voted by constituency
    allVoters.forEach(voter => {
      // Extract constituency from postcode first 3 digits
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
      
      // Count if this voter has cast their vote
      if (voter.voteCast === true) {
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

    // Overall statistics
    const overallStats = {
      totalRegisteredVoters: totalRegistered,
      totalVotesCast: totalVotesCast, // Total individual votes (MP + Council)
      totalVotersTurnout: totalVotersTurnout, // Voters who have cast at least one vote
      overallTurnoutPercentage: totalRegistered > 0 ? Math.round((totalVotersTurnout / totalRegistered) * 100) : 0,
      totalConstituencies: Object.keys(votersByConstituency).length
    };

    res.json({
      success: true,
      overallStats,
      votesByConstituency: Object.values(votesByConstituency),
      votersByConstituency: Object.values(votersByConstituency),
      candidateVotes: Object.values(candidateVotes),
      mpPartyVotes: mpPartyVotes,
      councilPartyVotes: councilPartyVotes,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching admin statistics:', error);
    res.status(500).json({ error: 'Failed to fetch voting statistics' });
  }
});

// Get detailed voter list
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
