const crypto = require('crypto');

class SecurityUtils {
  constructor() {
    // Use environment variable for encryption key in production
    const keyString = process.env.ENCRYPTION_KEY || 'WeVote2025SecureEncryptionKey123!';
    // Create a 32-byte key for AES-256
    this.encryptionKey = crypto.createHash('sha256').update(keyString).digest();
    this.algorithm = 'aes-256-cbc';
  }

  // Hash email using SHA-256
  hashEmail(email) {
    return crypto.createHash('sha256').update(email.toLowerCase()).digest('hex');
  }

  // Encrypt National Insurance number
  encryptNationalInsurance(niNumber) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(niNumber.toUpperCase(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
      encrypted: encrypted,
      iv: iv.toString('hex')
    };
  }

  // Decrypt National Insurance number
  decryptNationalInsurance(encryptedData) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Generate unique voter ID
  generateVoterId() {
    return 'VTR-' + crypto.randomBytes(8).toString('hex').toUpperCase();
  }

  // Encrypt TOTP secret for storage (instead of hashing)
  encryptTotpSecret(secret) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
      encrypted: encrypted,
      iv: iv.toString('hex')
    };
  }

  // Decrypt TOTP secret for verification
  decryptTotpSecret(encryptedData) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Hash TOTP secret for storage (legacy - keeping for compatibility)
  hashTotpSecret(secret) {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  // Encrypt voter access code
  encryptAccessCode(accessCode) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(accessCode.toString(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
      encrypted: encrypted,
      iv: iv.toString('hex')
    };
  }

  // Decrypt voter access code
  decryptAccessCode(encryptedData) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  // Hash National Insurance number for comparison
  hashNationalInsurance(niNumber) {
    return crypto.createHash('sha256').update(niNumber.toUpperCase()).digest('hex');
  }

  // Encrypt email address for receipt functionality
  encryptEmail(email) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
    let encrypted = cipher.update(email.toLowerCase(), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
      encrypted: encrypted,
      iv: iv.toString('hex')
    };
  }

  // Decrypt email address
  decryptEmail(encryptedData) {
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, Buffer.from(this.encryptionKey), iv);
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}

module.exports = new SecurityUtils();
