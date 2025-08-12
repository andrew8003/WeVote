import { Injectable } from '@angular/core';

export interface User {
  _id?: string;
  firstName: string;
  lastName: string;
  postcode: string;
  nationalInsurance: string;
  email?: string;
  emailVerified: boolean;
  totpVerified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://localhost:3000/api';
  private currentUserId: string | null = null;

  constructor() {}

  // Create user with personal details
  async createUser(personalDetails: any): Promise<{ userId: string }> {
    const response = await fetch(`${this.baseUrl}/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(personalDetails)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to save personal details');
    }

    const result = await response.json();
    this.currentUserId = result.userId;
    return result;
  }

  // Send email verification
  async sendEmailVerification(email: string): Promise<any> {
    if (!this.currentUserId) {
      throw new Error('No user ID available. Please save personal details first.');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentUserId}/send-email-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send verification email');
    }

    return await response.json();
  }

  // Verify email code
  async verifyEmailCode(code: string): Promise<any> {
    if (!this.currentUserId) {
      throw new Error('No user ID available');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentUserId}/verify-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify email');
    }

    return await response.json();
  }

  // Setup TOTP
  async setupTOTP(secret: string): Promise<any> {
    if (!this.currentUserId) {
      throw new Error('No user ID available');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentUserId}/setup-totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secret })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to setup TOTP');
    }

    return await response.json();
  }

  // Verify TOTP code
  async verifyTOTP(code: string): Promise<any> {
    if (!this.currentUserId) {
      throw new Error('No user ID available');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentUserId}/verify-totp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to verify TOTP');
    }

    return await response.json();
  }

  // Get user profile
  async getUserProfile(): Promise<User | null> {
    if (!this.currentUserId) {
      return null;
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentUserId}`);

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.user;
  }

  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  // Check if we have a current user ID
  hasCurrentUser(): boolean {
    return this.currentUserId !== null;
  }

  setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }
}
