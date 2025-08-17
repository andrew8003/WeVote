import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class AuthComponent implements OnInit {
  showQRCode = false;
  qrCodeDataURL = '';
  authCode = '';
  secretKey = '';
  verificationCode = '';
  showVerification = false;
  verificationSuccess = false;
  
  // Email verification properties
  showEmailSetup = true;
  userEmail = '';
  emailSent = false;
  emailVerificationCode = '';
  emailVerificationSuccess = false;

  constructor(private userService: UserService, private router: Router) {}

  ngOnInit() {
    // Check if user has saved personal details
    if (!this.userService.hasCurrentUser()) {
      alert('Please complete your personal details first.');
      this.router.navigate(['/']);
      return;
    }
  }

  async sendEmailVerification() {
    if (!this.userEmail || !this.isValidEmail(this.userEmail)) {
      alert('Please enter a valid email address.');
      return;
    }

    // Immediately switch to verification code input - don't wait for email
    this.emailSent = true;
    console.log('Switching to verification code input immediately');

    // Send email in the background without waiting
    this.userService.sendEmailVerification(this.userEmail)
      .then(result => {
        console.log('Verification email sent successfully in background:', result);
      })
      .catch(error => {
        console.error('Error sending email in background:', error);
        // Could optionally show a subtle notification here, but don't block the UI
      });
  }

  async verifyEmailCode() {
    if (!this.emailVerificationCode || this.emailVerificationCode.length !== 6) {
      alert('Please enter a 6-digit verification code.');
      return;
    }

    try {
      const result = await this.userService.verifyEmailCode(this.emailVerificationCode);
      
      this.emailVerificationSuccess = true;
      console.log('Email verification successful:', result);
      
    } catch (error) {
      console.error('Error verifying email:', error);
      alert(error instanceof Error ? error.message : 'Invalid verification code. Please check your email and try again.');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  resetEmailSetup() {
    this.userEmail = '';
    this.emailSent = false;
    this.emailVerificationCode = '';
    this.emailVerificationSuccess = false;
  }

  setupAuthenticatorApp() {
    console.log('Setting up authenticator app...');
    this.generateQRCode();
    this.showQRCode = true;
  }

  private generateQRCode() {
    // Generate a random secret key for the user
    this.secretKey = this.generateSecretKey();
    
    // Create the authenticator code (6-digit)
    this.authCode = this.generateAuthCode();
    
    // Store secret key in backend
    this.storeSecretInBackend(this.secretKey);
    
    // Create the QR code data in the format expected by authenticator apps
    const issuer = 'WeVote';
    const accountName = 'voter@wevote.com'; // This could be user's email
    const otpAuthURL = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(accountName)}?secret=${this.secretKey}&issuer=${encodeURIComponent(issuer)}`;
    
    // Generate QR code
    QRCode.toDataURL(otpAuthURL)
      .then(url => {
        this.qrCodeDataURL = url;
      })
      .catch(err => {
        console.error('Error generating QR code:', err);
      });
  }

  private async storeSecretInBackend(secret: string) {
    try {
      const result = await this.userService.setupTOTP(secret);
      console.log('TOTP secret stored in backend:', result);
    } catch (error) {
      console.error('Error storing secret:', error);
      alert('Failed to store authenticator setup. Please try again.');
    }
  }

  private generateSecretKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateAuthCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  resetAuthenticatorCard() {
    this.showQRCode = false;
    this.qrCodeDataURL = '';
    this.authCode = '';
    this.secretKey = '';
    this.verificationCode = '';
    this.showVerification = false;
    this.verificationSuccess = false;
  }

  proceedToVerification() {
    this.showVerification = true;
  }

  verifyAuthenticatorCode() {
    // Use real backend verification
    this.verifyCodeWithBackend(this.verificationCode);
  }

  private async verifyCodeWithBackend(code: string) {
    if (!code || code.length !== 6) {
      alert('Please enter a 6-digit code from your authenticator app.');
      return;
    }

    try {
      const result = await this.userService.verifyTOTP(code);
      
      this.verificationSuccess = true;
      console.log('Authenticator app successfully verified:', result);
      
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      alert(error instanceof Error ? error.message : 'Invalid code. Please try again with the current code from your authenticator app.');
    }
  }

  async finishRegistration() {
    if (this.emailVerificationSuccess && this.verificationSuccess) {
      try {
        console.log('Completing registration and saving to database...');
        
        // Complete registration in backend (save to MongoDB)
        const result = await this.userService.completeRegistration();
        
        console.log('Registration completed successfully:', result);
        
        // Navigate to completion page
        this.router.navigate(['/registration-complete']);
      } catch (error) {
        console.error('Error completing registration:', error);
        alert(error instanceof Error ? error.message : 'Failed to complete registration. Please try again.');
      }
    } else {
      alert('Please complete both email and authenticator app verification first.');
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
