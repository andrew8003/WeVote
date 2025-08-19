const express = require('express');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const { EmailClient } = require('@azure/communication-email');
const { ObjectId } = require('mongodb');
const dbConnection = require('../utils/database');
const securityUtils = require('../utils/security');

const router = express.Router();

// In-memory storage for user sessions (temporary storage before full registration)
const userSessions = new Map();

// Azure Communication Services Email client
const createEmailClient = () => {
  console.log('Creating Azure Communication Services email client');
  return new EmailClient(process.env.AZURE_COMMUNICATION_CONNECTION_STRING);
};

// Send voting notification email with voter verification code
const sendVotingNotificationEmail = async (email) => {
  console.log('Sending voting notification email to:', email);
  
  // Generate 6-digit voter verification code
  const voterVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  try {
    // Connect to database and find the voter by email hash
    const db = await dbConnection.connect();
    const voterAuthCollection = dbConnection.getVoterAuthCollection();
    
    const hashedEmail = securityUtils.hashEmail(email);
    const voterAuth = await voterAuthCollection.findOne({ emailHash: hashedEmail });
    
    if (!voterAuth) {
      console.error('Voter not found for email:', email);
      throw new Error('Voter not found');
    }
    
    // Encrypt the access code
    const encryptedAccessCode = securityUtils.encryptAccessCode(voterVerificationCode);
    
    // Store encrypted access code in voter_auth table
    await voterAuthCollection.updateOne(
      { _id: voterAuth._id },
      { 
        $set: {
          accessCodeEncrypted: encryptedAccessCode.encrypted,
          accessCodeIV: encryptedAccessCode.iv,
          accessCodeCreated: new Date(),
          accessCodeExpires: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        }
      }
    );
    
    console.log('Encrypted access code stored for voter:', voterAuth.voterId);
    
  } catch (dbError) {
    console.error('Database error storing access code:', dbError);
    throw dbError;
  }
  
  const emailClient = createEmailClient();
  
  const emailMessage = {
    senderAddress: process.env.EMAIL_FROM || "DoNotReply@wevote.digital",
    content: {
      subject: "*DEMO* WeVote - Voting is Now Open!",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">🗳️ WeVote</h1>
            <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Secure Digital Democracy</p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
            <h2 style="color: #2d3748; margin: 0 0 20px 0;">*DEMO* Voting is Now Open!</h2>
            
            <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Congratulations! Your voter registration has been completed successfully. 
              The polls are now open and you can cast your vote securely using the WeVote platform.
            </p>
            
            <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
              <h3 style="color: #2d3748; margin: 0 0 15px 0;">Your Voter Verification Code</h3>
              <div style="background: white; border: 3px solid #667eea; border-radius: 8px; padding: 20px; margin: 15px 0;">
                <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 5px; font-family: monospace;">${voterVerificationCode}</h1>
              </div>
              <p style="color: #718096; font-size: 14px; margin: 10px 0 0 0;">
                <strong>Save this code!</strong> You'll need it along with your National Insurance number and authenticator app to access your ballot.
              </p>
            </div>
            
            <div style="background: #edf2f7; border-radius: 10px; padding: 20px; margin: 25px 0;">
              <h4 style="color: #2d3748; margin: 0 0 15px 0;">🔐 To Cast Your Vote, You'll Need:</h4>
              <ul style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
                <li>This 6-digit voter verification code</li>
                <li>Your National Insurance number</li>
                <li>Your authenticator app (Google Authenticator, Authy, etc.)</li>
              </ul>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="http://localhost:4200/vote-login" 
                 style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; 
                        text-decoration: none; 
                        padding: 15px 30px; 
                        border-radius: 8px; 
                        font-weight: 600; 
                        font-size: 16px; 
                        display: inline-block;">
                🗳️ Cast Your Vote Now
              </a>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
              <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0;">
                <strong>Important:</strong> This is a demonstration of the WeVote system. 
                In a real election, this email would only be sent when official polling opens. 
                Keep this verification code secure and do not share it with anyone.
              </p>
            </div>
          </div>
          
          <div style="text-align: center; padding: 20px; color: #a0aec0; font-size: 12px;">
            WeVote - Secure Digital Voting Platform<br>
            This is an automated message, please do not reply.
          </div>
        </div>
      `
    },
    recipients: {
      to: [
        {
          address: email
        }
      ]
    }
  };
  
  console.log('Sending voting notification email with Azure Communication Services...');
  const poller = await emailClient.beginSend(emailMessage);
  const result = await poller.pollUntilDone();
  
  console.log('Voting notification email sent successfully:', result.id);
  return { success: true, verificationCode: voterVerificationCode };
};

// Store user personal details in session (before authentication)
router.post('/users', async (req, res) => {
  try {
    console.log('POST /users called with:', req.body);
    
    const { firstName, lastName, postcode, nationalInsurance } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !postcode || !nationalInsurance) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        error: 'All personal details are required' 
      });
    }

    // Generate a temporary session ID
    const sessionId = crypto.randomUUID();
    
    // Store personal details in memory (temporary)
    const userData = {
      sessionId,
      firstName,
      lastName,
      postcode: postcode.toUpperCase(),
      nationalInsurance: nationalInsurance.toUpperCase(),
      email: null,
      emailVerified: false,
      totpSecret: null,
      totpVerified: false,
      createdAt: new Date()
    };
    
    userSessions.set(sessionId, userData);
    
    console.log('User session created:', sessionId);
    
    res.json({ 
      success: true, 
      sessionId: sessionId,
      message: 'Personal details saved. Please proceed with email verification.' 
    });

  } catch (error) {
    console.error('Error storing user details:', error);
    res.status(500).json({ error: 'Failed to store user details' });
  }
});

// Add email to existing session
router.post('/users/:sessionId/email', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { email } = req.body;

    console.log('Adding email to session:', sessionId, 'Email:', email);

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get user data from session
    const userData = userSessions.get(sessionId);
    if (!userData) {
      console.log('Session not found:', sessionId);
      return res.status(404).json({ error: 'Session not found. Please restart the registration process.' });
    }

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Update session with email
    userData.email = email.toLowerCase();
    userData.emailVerified = false;
    userSessions.set(sessionId, userData);

    console.log('Email added to session:', sessionId);

    res.json({ 
      success: true, 
      message: 'Email added successfully. Please proceed with verification.' 
    });

  } catch (error) {
    console.error('Error adding email:', error);
    res.status(500).json({ error: 'Failed to add email' });
  }
});

// Send email verification code
router.post('/users/:sessionId/send-email-verification', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get user data from session
    const userData = userSessions.get(sessionId);
    if (!userData) {
      return res.status(404).json({ error: 'Session not found. Please restart the registration process.' });
    }

    if (!userData.email) {
      return res.status(400).json({ error: 'Email not provided. Please add email first.' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store in session with expiration (5 minutes)
    userData.emailVerificationCode = verificationCode;
    userData.emailCodeExpires = new Date(Date.now() + 5 * 60 * 1000);
    userSessions.set(sessionId, userData);

    // Send email using Azure Communication Services
    const emailClient = createEmailClient();
    
    const emailMessage = {
      senderAddress: process.env.EMAIL_FROM || "DoNotReply@wevote.digital",
      content: {
        subject: "*DEMO* WeVote - Email Verification Code",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">🗳️ WeVote</h1>
              <p style="color: white; margin: 10px 0 0 0; font-size: 16px;">Secure Digital Democracy</p>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e2e8f0;">
              <h2 style="color: #2d3748; margin: 0 0 20px 0;">Email Verification Required</h2>
              
              <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                Thank you for registering with WeVote. Please use the verification code below to confirm your email address:
              </p>
              
              <div style="background: #f8f9fa; border-radius: 10px; padding: 25px; margin: 25px 0; text-align: center;">
                <h3 style="color: #2d3748; margin: 0 0 15px 0;">Your Verification Code</h3>
                <div style="background: white; border: 3px solid #667eea; border-radius: 8px; padding: 20px; margin: 15px 0;">
                  <h1 style="color: #667eea; font-size: 36px; margin: 0; letter-spacing: 5px; font-family: monospace;">${verificationCode}</h1>
                </div>
                <p style="color: #718096; font-size: 14px; margin: 10px 0 0 0;">
                  This code will expire in 5 minutes.
                </p>
              </div>
              
              <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 30px;">
                <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 0;">
                  <strong>Important:</strong> This is a demonstration of the WeVote system. 
                  Do not share this verification code with anyone.
                </p>
              </div>
            </div>
            
            <div style="text-align: center; padding: 20px; color: #a0aec0; font-size: 12px;">
              WeVote - Secure Digital Voting Platform<br>
              This is an automated message, please do not reply.
            </div>
          </div>
        `
      },
      recipients: {
        to: [
          {
            address: userData.email
          }
        ]
      }
    };

    console.log('Sending email verification to:', userData.email);
    const poller = await emailClient.beginSend(emailMessage);
    const result = await poller.pollUntilDone();
    
    console.log('Email verification sent successfully:', result.id);

    res.json({ 
      success: true, 
      message: 'Verification code sent to your email address' 
    });

  } catch (error) {
    console.error('Error sending verification email:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify email code
router.post('/users/:sessionId/verify-email', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code } = req.body;

    console.log('Verifying email for session:', sessionId, 'with code:', code);

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    // Get user data from session
    const userData = userSessions.get(sessionId);
    if (!userData) {
      console.log('Session not found:', sessionId);
      return res.status(404).json({ error: 'Session not found. Please restart the registration process.' });
    }

    console.log('Session data for verification:', {
      hasCode: !!userData.emailVerificationCode,
      codeExpiry: userData.emailCodeExpires,
      emailCodeExpires: userData.emailCodeExpires,
      emailVerified: userData.emailVerified
    });

    // Check if code matches and hasn't expired
    if (!userData.emailVerificationCode) {
      console.log('No verification code in session');
      return res.status(400).json({ error: 'No verification code found. Please request a new code.' });
    }

    if (userData.emailVerificationCode !== code) {
      console.log('Code mismatch. Expected:', userData.emailVerificationCode, 'Got:', code);
      return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
    }

    if (userData.emailCodeExpires && new Date() > userData.emailCodeExpires) {
      console.log('Code expired. Expiry:', userData.emailCodeExpires, 'Now:', new Date());
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    // Mark email as verified in session
    userData.emailVerified = true;
    userData.emailVerificationCode = null; // Clear the used code
    userData.emailCodeExpires = null;
    userSessions.set(sessionId, userData);

    console.log('Email verified successfully for session:', sessionId);

    // Send voting notification email with voter verification code
    try {
      await sendVotingNotificationEmail(userData.email);
    } catch (emailError) {
      console.error('Failed to send voting notification email:', emailError);
      // Don't fail the verification if the notification email fails
    }

    res.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });

  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Setup TOTP (store secret in session)
router.post('/users/:sessionId/setup-totp', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { secret } = req.body;

    console.log('Setting up TOTP for session:', sessionId, 'with secret:', secret ? 'PROVIDED' : 'MISSING');

    if (!secret) {
      return res.status(400).json({ error: 'TOTP secret is required' });
    }

    // Get user data from session
    const userData = userSessions.get(sessionId);
    if (!userData) {
      console.log('Session not found for TOTP setup:', sessionId);
      return res.status(404).json({ error: 'Session not found. Please restart the registration process.' });
    }

    // Store TOTP secret in session
    userData.totpSecret = secret;
    userData.totpVerified = false;
    userSessions.set(sessionId, userData);

    console.log('TOTP secret stored successfully in session:', sessionId);

    res.json({ 
      success: true, 
      message: 'TOTP secret stored successfully' 
    });

  } catch (error) {
    console.error('Error storing TOTP secret:', error);
    res.status(500).json({ error: 'Failed to store TOTP secret' });
  }
});

// Verify TOTP code (works with session storage)
router.post('/users/:sessionId/verify-totp', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { code } = req.body;

    console.log('Verifying TOTP for session:', sessionId, 'with code:', code);

    if (!code) {
      return res.status(400).json({ error: 'TOTP code is required' });
    }

    // Get user data from session
    const userData = userSessions.get(sessionId);
    if (!userData) {
      console.log('Session not found for TOTP verification:', sessionId);
      return res.status(404).json({ error: 'Session not found. Please restart the registration process.' });
    }

    if (!userData.totpSecret) {
      console.log('No TOTP secret found in session');
      return res.status(400).json({ 
        error: 'TOTP not set up. Please set up authenticator app first.' 
      });
    }

    // Verify TOTP code using speakeasy
    const verified = speakeasy.totp.verify({
      secret: userData.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 1 step tolerance (30 seconds before/after)
    });

    if (!verified) {
      console.log('TOTP verification failed for session:', sessionId);
      return res.status(400).json({ 
        error: 'Invalid TOTP code. Please check your authenticator app and try again.' 
      });
    }

    // Mark TOTP as verified in session
    userData.totpVerified = true;
    userSessions.set(sessionId, userData);

    console.log('TOTP verified successfully for session:', sessionId);

    res.json({ 
      success: true, 
      message: 'TOTP verified successfully' 
    });

  } catch (error) {
    console.error('Error verifying TOTP:', error);
    res.status(500).json({ error: 'Failed to verify TOTP code' });
  }
});

// Get user profile
router.get('/users/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const db = await dbConnection.connect();
    const usersCollection = dbConnection.getUsersCollection();

    const user = await usersCollection.findOne(
      { _id: new ObjectId(userId) },
      { projection: { totpSecret: 0 } } // Don't return the secret
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      success: true, 
      user: user 
    });

  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user profile' });
  }
});

// Complete registration - save to MongoDB after both verifications
router.post('/users/:sessionId/complete-registration', async (req, res) => {
  try {
    const { sessionId } = req.params;

    // Get user data from session
    const userData = userSessions.get(sessionId);
    if (!userData) {
      return res.status(404).json({ error: 'Session not found. Please restart the registration process.' });
    }

    // Check if both verifications are complete
    if (!userData.emailVerified || !userData.totpVerified) {
      return res.status(400).json({ 
        error: 'Both email and authenticator app verification must be completed first' 
      });
    }

    // Generate unique voter ID
    const voterId = securityUtils.generateVoterId();

    // Now save to MongoDB with proper security
    const db = await dbConnection.connect();
    const votersCollection = dbConnection.getVotersCollection();
    const voterAuthCollection = dbConnection.getVoterAuthCollection();

    // Encrypt National Insurance number
    const encryptedNI = securityUtils.encryptNationalInsurance(userData.nationalInsurance);
    
    // Hash email
    const hashedEmail = securityUtils.hashEmail(userData.email);

    // Check if user already exists (by hashed email to avoid duplicates)
    const existingAuth = await voterAuthCollection.findOne({ 
      emailHash: hashedEmail 
    });

    if (existingAuth) {
      return res.status(400).json({ 
        error: 'A voter with this email address is already registered.' 
      });
    }

    try {
      // Create voter record (personal information)
      const voterRecord = {
        voterId: voterId,
        firstName: userData.firstName,
        lastName: userData.lastName,
        postcode: userData.postcode.toUpperCase(),
        nationalInsuranceEncrypted: encryptedNI.encrypted,
        nationalInsuranceIV: encryptedNI.iv,
        voteCast: false, // Default: no vote cast yet
        registrationDate: new Date(),
        updatedAt: new Date()
      };

      // Create authentication record (auth information)
      const encryptedTotpSecret = securityUtils.encryptTotpSecret(userData.totpSecret);
      const authRecord = {
        voterId: voterId, // Foreign key to voter
        emailHash: hashedEmail,
        emailVerified: true,
        totpSecretEncrypted: encryptedTotpSecret.encrypted,
        totpSecretIV: encryptedTotpSecret.iv,
        totpVerified: true,
        authSetupDate: new Date(),
        lastAuthUpdate: new Date()
      };

      // Insert both records
      const voterResult = await votersCollection.insertOne(voterRecord);
      const authResult = await voterAuthCollection.insertOne(authRecord);

      console.log('Voter saved with ID:', voterId);
      console.log('Database records created:', {
        voterObjectId: voterResult.insertedId,
        authObjectId: authResult.insertedId
      });

      // Clean up session data
      userSessions.delete(sessionId);

      res.json({ 
        success: true, 
        voterId: voterId,
        message: 'Registration completed successfully! Voter records created securely.' 
      });

    } catch (dbError) {
      console.error('Database insertion error:', dbError);
      
      // Clean up any partial records if one insert succeeded and other failed
      try {
        await votersCollection.deleteOne({ voterId: voterId });
        await voterAuthCollection.deleteOne({ voterId: voterId });
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
      
      throw dbError;
    }

  } catch (error) {
    console.error('Error completing registration:', error);
    res.status(500).json({ error: 'Failed to complete registration' });
  }
});

// Voter verification endpoint for voting day
router.post('/verify-voter', async (req, res) => {
  try {
    const { emailCode, nationalInsurance, totpCode } = req.body;

    console.log('Voter verification attempt:', {
      emailCode: emailCode ? 'PROVIDED' : 'MISSING',
      nationalInsurance: nationalInsurance ? 'PROVIDED' : 'MISSING',
      totpCode: totpCode ? 'PROVIDED' : 'MISSING'
    });

    // Validate input
    if (!emailCode || !nationalInsurance || !totpCode) {
      return res.status(400).json({ 
        error: 'All verification fields are required: email code, National Insurance number, and TOTP code' 
      });
    }

    const db = await dbConnection.connect();
    const votersCollection = dbConnection.getVotersCollection();
    const voterAuthCollection = dbConnection.getVoterAuthCollection();

    // First, find all voters who haven't cast their vote yet
    const eligibleVoters = await votersCollection.find({ voteCast: false }).toArray();
    
    if (eligibleVoters.length === 0) {
      return res.status(404).json({ 
        error: 'No eligible voters found or all votes have been cast' 
      });
    }

    console.log(`Found ${eligibleVoters.length} eligible voters who haven't voted yet`);

    let matchedVoter = null;
    let matchedAuth = null;

    // Check each eligible voter to see if they match the provided credentials
    for (const voter of eligibleVoters) {
      try {
        // Decrypt and compare National Insurance number
        const decryptedNI = securityUtils.decryptNationalInsurance({
          encrypted: voter.nationalInsuranceEncrypted,
          iv: voter.nationalInsuranceIV
        });

        if (decryptedNI.toUpperCase() === nationalInsurance.toUpperCase()) {
          console.log('National Insurance match found for voter:', voter.voterId);
          
          // Get the corresponding auth record
          const authRecord = await voterAuthCollection.findOne({ voterId: voter.voterId });
          
          if (!authRecord) {
            console.log('No auth record found for voter:', voter.voterId);
            continue;
          }

          // Check if access code exists and hasn't expired
          if (!authRecord.accessCodeEncrypted || !authRecord.accessCodeIV) {
            console.log('No access code found for voter:', voter.voterId);
            continue;
          }

          if (authRecord.accessCodeExpires && new Date() > authRecord.accessCodeExpires) {
            console.log('Access code expired for voter:', voter.voterId);
            continue;
          }

          // Decrypt and verify the access code
          const decryptedAccessCode = securityUtils.decryptAccessCode({
            encrypted: authRecord.accessCodeEncrypted,
            iv: authRecord.accessCodeIV
          });

          if (decryptedAccessCode === emailCode) {
            console.log('Access code match found for voter:', voter.voterId);
            
            // Decrypt and verify TOTP code using the encrypted secret
            if (!authRecord.totpSecretEncrypted || !authRecord.totpSecretIV) {
              console.log('No TOTP secret found for voter:', voter.voterId);
              continue;
            }

            const decryptedTotpSecret = securityUtils.decryptTotpSecret({
              encrypted: authRecord.totpSecretEncrypted,
              iv: authRecord.totpSecretIV
            });

            const verified = speakeasy.totp.verify({
              secret: decryptedTotpSecret,
              encoding: 'base32', // Original secret encoding
              token: totpCode,
              window: 2 // Allow some tolerance for time drift
            });

            if (verified) {
              console.log('TOTP verification successful for voter:', voter.voterId);
              matchedVoter = voter;
              matchedAuth = authRecord;
              break;
            } else {
              console.log('TOTP verification failed for voter:', voter.voterId);
            }
          } else {
            console.log('Access code mismatch for voter:', voter.voterId);
          }
        }
      } catch (decryptError) {
        console.error('Error checking voter:', voter.voterId, decryptError);
        continue;
      }
    }

    if (!matchedVoter || !matchedAuth) {
      return res.status(401).json({ 
        error: 'Invalid credentials. Please check your access code, National Insurance number, and authenticator code.' 
      });
    }

    // Generate a secure ballot token for this voting session
    const ballotToken = crypto.randomBytes(32).toString('hex');
    
    // Store the ballot token temporarily (in production, use Redis or similar)
    // For now, we'll add it to the auth record with an expiration
    await voterAuthCollection.updateOne(
      { _id: matchedAuth._id },
      { 
        $set: {
          ballotToken: ballotToken,
          ballotTokenExpires: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          lastLoginAttempt: new Date()
        }
      }
    );

    console.log('Voter verification successful for:', matchedVoter.voterId);

    res.json({ 
      success: true, 
      message: 'Voter verification successful',
      ballotToken: ballotToken,
      voter: {
        voterId: matchedVoter.voterId,
        firstName: matchedVoter.firstName,
        lastName: matchedVoter.lastName,
        postcode: matchedVoter.postcode
      }
    });

  } catch (error) {
    console.error('Error verifying voter:', error);
    res.status(500).json({ error: 'Failed to verify voter credentials' });
  }
});

module.exports = router;
