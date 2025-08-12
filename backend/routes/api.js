const express = require('express');
const speakeasy = require('speakeasy');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { ObjectId } = require('mongodb');
const dbConnection = require('../utils/database');

const router = express.Router();

// In-memory storage for user sessions (temporary storage before full registration)
const userSessions = new Map();

// Email transporter setup (you'll need to configure this)
const createEmailTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
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
    console.log('User data stored in session:', sessionId);

    res.json({ 
      success: true, 
      userId: sessionId, // Use session ID as temporary user ID
      message: 'Personal details saved in session successfully' 
    });

  } catch (error) {
    console.error('Error saving personal details:', error);
    res.status(500).json({ error: 'Failed to save personal details' });
  }
});

// Send email verification (works with session storage)
router.post('/users/:sessionId/send-email-verification', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get user data from session
    const userData = userSessions.get(sessionId);
    if (!userData) {
      return res.status(404).json({ error: 'Session not found. Please restart the registration process.' });
    }

    // Generate 6-digit verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Update session data with email and code
    userData.email = email;
    userData.emailVerificationCode = verificationCode;
    userData.emailCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    userSessions.set(sessionId, userData);

    // Send email (configure your email settings in .env)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        const transporter = createEmailTransporter();
        
        await transporter.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: email,
          subject: 'WeVote - Email Verification Code',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #667eea;">WeVote Email Verification</h2>
              <p>Your verification code for the WeVote E-Voting system is:</p>
              <div style="background: #f8f9fa; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                <h1 style="color: #667eea; font-size: 32px; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
              </div>
              <p><strong>This code expires in 10 minutes.</strong></p>
              <p>If you didn't request this verification, please ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #e9ecef; margin: 30px 0;">
              <p style="color: #6c757d; font-size: 14px;">
                WeVote - Secure Digital Voting Platform<br>
                This is an automated message, please do not reply.
              </p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        // Continue without failing the request - code is still stored
      }
    }

    res.json({ 
      success: true, 
      message: 'Verification code sent to email',
      // In development, return the code (remove in production)
      ...(process.env.NODE_ENV !== 'production' && { developmentCode: verificationCode })
    });

  } catch (error) {
    console.error('Error sending email verification:', error);
    res.status(500).json({ error: 'Failed to send verification email' });
  }
});

// Verify email code
router.post('/users/:userId/verify-email', async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required' });
    }

    const db = await dbConnection.connect();
    const usersCollection = dbConnection.getUsersCollection();
    const emailCodesCollection = dbConnection.getEmailCodesCollection();

    // Find verification code
    const storedCode = await emailCodesCollection.findOne({
      userId: new ObjectId(userId),
      code: code,
      expiresAt: { $gt: new Date() }
    });

    if (!storedCode) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification code' 
      });
    }

    // Mark email as verified
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          emailVerified: true,
          updatedAt: new Date()
        }
      }
    );

    // Remove used verification code
    await emailCodesCollection.deleteOne({ _id: storedCode._id });

    res.json({ 
      success: true, 
      message: 'Email verified successfully' 
    });

  } catch (error) {
    console.error('Error verifying email:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Setup TOTP (store secret)
router.post('/users/:userId/setup-totp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { secret } = req.body;

    if (!secret) {
      return res.status(400).json({ error: 'TOTP secret is required' });
    }

    const db = await dbConnection.connect();
    const usersCollection = dbConnection.getUsersCollection();

    // Store TOTP secret
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          totpSecret: secret,
          totpVerified: false,
          updatedAt: new Date()
        }
      }
    );

    res.json({ 
      success: true, 
      message: 'TOTP secret stored successfully' 
    });

  } catch (error) {
    console.error('Error storing TOTP secret:', error);
    res.status(500).json({ error: 'Failed to store TOTP secret' });
  }
});

// Verify TOTP code
router.post('/users/:userId/verify-totp', async (req, res) => {
  try {
    const { userId } = req.params;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'TOTP code is required' });
    }

    const db = await dbConnection.connect();
    const usersCollection = dbConnection.getUsersCollection();

    // Get user's TOTP secret
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    
    if (!user || !user.totpSecret) {
      return res.status(400).json({ 
        error: 'TOTP not set up for this user' 
      });
    }

    // Verify TOTP code using speakeasy
    const verified = speakeasy.totp.verify({
      secret: user.totpSecret,
      encoding: 'base32',
      token: code,
      window: 1 // Allow 1 step tolerance (30 seconds before/after)
    });

    if (!verified) {
      return res.status(400).json({ 
        error: 'Invalid TOTP code' 
      });
    }

    // Mark TOTP as verified
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { 
        $set: { 
          totpVerified: true,
          updatedAt: new Date()
        }
      }
    );

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

    // Now save to MongoDB
    const db = await dbConnection.connect();
    const usersCollection = dbConnection.getUsersCollection();

    // Check if user already exists with this NI number
    const existingUser = await usersCollection.findOne({ 
      nationalInsurance: userData.nationalInsurance 
    });

    let userId;
    if (existingUser) {
      // Update existing user
      await usersCollection.updateOne(
        { _id: existingUser._id },
        { 
          $set: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            postcode: userData.postcode,
            email: userData.email,
            emailVerified: true,
            totpSecret: userData.totpSecret,
            totpVerified: true,
            updatedAt: new Date()
          }
        }
      );
      userId = existingUser._id;
    } else {
      // Create new user in MongoDB
      const newUser = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        postcode: userData.postcode,
        nationalInsurance: userData.nationalInsurance,
        email: userData.email,
        emailVerified: true,
        totpSecret: userData.totpSecret,
        totpVerified: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await usersCollection.insertOne(newUser);
      userId = result.insertedId;
    }

    // Clean up session data
    userSessions.delete(sessionId);

    res.json({ 
      success: true, 
      userId: userId,
      message: 'Registration completed successfully! User saved to database.' 
    });

  } catch (error) {
    console.error('Error completing registration:', error);
    res.status(500).json({ error: 'Failed to complete registration' });
  }
});

module.exports = router;
