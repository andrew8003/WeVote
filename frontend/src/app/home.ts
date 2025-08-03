import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  personalForm: FormGroup;
  showQRCode = false;
  qrCodeDataURL = '';
  authCode = '';
  secretKey = '';
  verificationCode = '';
  showVerification = false;
  verificationSuccess = false;
  
  // Email verification properties
  showEmailSetup = false;
  userEmail = '';
  emailSent = false;
  emailVerificationCode = '';
  emailVerificationSuccess = false;

  constructor(private fb: FormBuilder) {
    this.personalForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      postcode: ['', [Validators.required, Validators.pattern(/^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][ABD-HJLNP-UW-Z]{2}$/i)]],
      nationalInsurance: ['', [
        Validators.required, 
        Validators.pattern(/^[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}[0-9]{6}[A-D]{1}$/i)
      ]]
    });
  }

  onSubmitPersonalDetails() {
    if (this.personalForm.valid) {
      console.log('Personal details submitted:', this.personalForm.value);
      // Handle form submission
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.personalForm.controls).forEach(key => {
        this.personalForm.get(key)?.markAsTouched();
      });
    }
  }

  setupEmailAuth() {
    console.log('Setting up email authentication...');
    this.showEmailSetup = true;
  }

  async sendEmailVerification() {
    if (!this.userEmail || !this.isValidEmail(this.userEmail)) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      // For now, simulate sending email - replace with actual API call
      console.log('Sending verification email to:', this.userEmail);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.emailSent = true;
      console.log('Verification email sent successfully');
      
      // In real implementation, call your backend API:
      // const response = await fetch('/api/send-verification-email', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ email: this.userEmail })
      // });
      
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Failed to send verification email. Please try again.');
    }
  }

  verifyEmailCode() {
    if (!this.emailVerificationCode || this.emailVerificationCode.length !== 6) {
      alert('Please enter a 6-digit verification code.');
      return;
    }

    // For demo purposes, simulate verification
    const isValid = this.simulateEmailVerification(this.emailVerificationCode);
    
    if (isValid) {
      this.emailVerificationSuccess = true;
      console.log('Email verification successful!');
    } else {
      alert('Invalid verification code. Please check your email and try again.');
    }
  }

  private simulateEmailVerification(code: string): boolean {
    // In real implementation, verify with backend
    // For demo, accept any 6-digit number
    return /^\d{6}$/.test(code);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  resetEmailSetup() {
    this.showEmailSetup = false;
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
    // In a real app, you would verify this against the TOTP algorithm
    // For demo purposes, we'll simulate verification
    if (this.verificationCode && this.verificationCode.length === 6) {
      // Simulate verification logic
      const isValid = this.simulateCodeVerification(this.verificationCode);
      
      if (isValid) {
        this.verificationSuccess = true;
        console.log('Authenticator app successfully verified!');
      } else {
        alert('Invalid code. Please try again with the current code from your authenticator app.');
      }
    } else {
      alert('Please enter a 6-digit code from your authenticator app.');
    }
  }

  private simulateCodeVerification(code: string): boolean {
    // In a real implementation, you would use a TOTP library to verify the code
    // For demo purposes, we'll accept any 6-digit number
    return /^\d{6}$/.test(code);
  }

  proceedToVoting() {
    if (this.personalForm.valid) {
      console.log('Proceeding to voting...');
      // Navigate to voting page or next step
    }
  }
}
