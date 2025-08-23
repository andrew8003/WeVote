import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import * as QRCode from 'qrcode';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.html',
  styleUrl: './auth.css'
})
export class AuthComponent implements OnInit, OnDestroy {
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
  
  // Loading states
  isSendingEmail = false;
  isVerifyingEmail = false;
  isVerifyingAuth = false;
  isFinishingRegistration = false;
  
  // Email resend functionality
  emailSentTime: Date | null = null;
  canResendEmail = false;
  resendCountdown = 0;
  private resendTimer: any;

  // Error messages
  generalError = '';
  emailError = '';
  authError = '';
  verificationError = '';

  constructor(
    private userService: UserService, 
    private router: Router,
    private titleService: Title
  ) {}

  ngOnInit() {
    this.titleService.setTitle('WeVote - Authentication Setup');
    
    // Check if user has saved personal details
    if (!this.userService.hasCurrentSession()) {
      this.generalError = 'Please complete your personal details first.';
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 3000);
      return;
    }
  }

  clearEmailError() {
    this.emailError = '';
  }

  clearAuthError() {
    this.authError = '';
  }

  ngOnDestroy() {
    // Clean up timer
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
  }

  async sendEmailVerification() {
    if (!this.userEmail || !this.isValidEmail(this.userEmail)) {
      this.emailError = 'Please enter a valid email address.';
      return;
    }

    // Clear previous errors
    this.emailError = '';

    if (this.isSendingEmail) {
      return; // Prevent multiple clicks
    }

    this.isSendingEmail = true;

    try {
      // First add email to the session
      await this.userService.addEmail(this.userEmail);
      console.log('Email added to session successfully');

      // Then send verification email
      await this.userService.sendEmailVerification();
      console.log('Verification email sent successfully');

      // Switch to verification code input
      this.emailSent = true;
      this.emailSentTime = new Date();
      this.startResendTimer();
      console.log('Switching to verification code input');

    } catch (error: any) {
      console.error('Error sending email verification:', error);
      this.emailError = error.message || 'Failed to send verification email';
    } finally {
      this.isSendingEmail = false;
    }
  }

  private startResendTimer() {
    this.canResendEmail = false;
    this.resendCountdown = 300; // 5 minutes in seconds
    
    this.resendTimer = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.canResendEmail = true;
        clearInterval(this.resendTimer);
      }
    }, 1000);
  }

  async resendEmail() {
    if (!this.canResendEmail || this.isSendingEmail) {
      return;
    }

    this.isSendingEmail = true;

    try {
      await this.userService.sendEmailVerification();
      console.log('Verification email resent successfully');
      
      this.emailSentTime = new Date();
      this.startResendTimer();
      
    } catch (error: any) {
      console.error('Error resending email verification:', error);
      this.emailError = error.message || 'Failed to resend verification email';
    } finally {
      this.isSendingEmail = false;
    }
  }

  getResendTimeString(): string {
    const minutes = Math.floor(this.resendCountdown / 60);
    const seconds = this.resendCountdown % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  async verifyEmailCode() {
    if (!this.emailVerificationCode || this.emailVerificationCode.length !== 6) {
      this.emailError = 'Please enter a 6-digit verification code.';
      return;
    }

    if (this.isVerifyingEmail) {
      return; // Prevent multiple clicks
    }

    // Clear previous errors
    this.emailError = '';
    this.isVerifyingEmail = true;

    try {
      const result = await this.userService.verifyEmailCode(this.emailVerificationCode);
      
      this.emailVerificationSuccess = true;
      console.log('Email verification successful:', result);
      
      // Clean up timer
      if (this.resendTimer) {
        clearInterval(this.resendTimer);
      }
      
    } catch (error) {
      console.error('Error verifying email:', error);
      this.emailError = error instanceof Error ? error.message : 'Invalid verification code. Please check your email and try again.';
    } finally {
      this.isVerifyingEmail = false;
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
    this.emailSentTime = null;
    this.canResendEmail = false;
    this.resendCountdown = 0;
    
    if (this.resendTimer) {
      clearInterval(this.resendTimer);
    }
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
      this.authError = 'Failed to store authenticator setup. Please try again.';
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
      this.authError = 'Please enter a 6-digit code from your authenticator app.';
      return;
    }

    if (this.isVerifyingAuth) {
      return; // Prevent multiple clicks
    }

    // Clear previous errors
    this.authError = '';
    this.isVerifyingAuth = true;

    try {
      const result = await this.userService.verifyTOTP(code);
      
      this.verificationSuccess = true;
      console.log('Authenticator app successfully verified:', result);
      
    } catch (error) {
      console.error('Error verifying TOTP:', error);
      this.authError = error instanceof Error ? error.message : 'Invalid code. Please try again with the current code from your authenticator app.';
    } finally {
      this.isVerifyingAuth = false;
    }
  }

  async finishRegistration() {
    if (!this.emailVerificationSuccess || !this.verificationSuccess) {
      this.generalError = 'Please complete both email and authenticator app verification first.';
      return;
    }

    if (this.isFinishingRegistration) {
      return; // Prevent multiple clicks
    }

    this.isFinishingRegistration = true;

    try {
      // Clear previous errors
      this.generalError = '';
      
      console.log('Completing registration and saving to database...');
      
      // Complete registration in backend (save to MongoDB)
      const result = await this.userService.completeRegistration();
      
      console.log('Registration completed successfully:', result);
      
      // Navigate to completion page
      this.router.navigate(['/registration-complete']);
    } catch (error) {
      console.error('Error completing registration:', error);
      this.generalError = error instanceof Error ? error.message : 'Failed to complete registration. Please try again.';
    } finally {
      this.isFinishingRegistration = false;
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }
}
