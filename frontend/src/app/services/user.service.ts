import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

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

export interface VoterVerificationResponse {
  success: boolean;
  message: string;
  ballotToken: string;
  voter: {
    voterId: string;
    firstName: string;
    lastName: string;
    postcode: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'http://localhost:3000/api';
  private currentSessionId: string | null = null;

  constructor() {}

  // Create user with personal details
  async createUser(personalDetails: any): Promise<{ sessionId: string }> {
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
    this.currentSessionId = result.sessionId;
    return result;
  }

  // Add email to existing session
  async addEmail(email: string): Promise<any> {
    if (!this.currentSessionId) {
      throw new Error('No session ID available. Please save personal details first.');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentSessionId}/email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to add email');
    }

    return await response.json();
  }

  // Send email verification
  async sendEmailVerification(): Promise<any> {
    if (!this.currentSessionId) {
      throw new Error('No session ID available. Please save personal details first.');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentSessionId}/send-email-verification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to send verification email');
    }

    return await response.json();
  }

  // Verify email code
  async verifyEmailCode(code: string): Promise<any> {
    if (!this.currentSessionId) {
      throw new Error('No session ID available');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentSessionId}/verify-email`, {
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
    if (!this.currentSessionId) {
      throw new Error('No session ID available');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentSessionId}/setup-totp`, {
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
    if (!this.currentSessionId) {
      throw new Error('No session ID available');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentSessionId}/verify-totp`, {
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

  // Get user profile (for session-based flow, this may not be needed)
  async getUserProfile(): Promise<User | null> {
    if (!this.currentSessionId) {
      return null;
    }

    // Note: This endpoint may not exist for sessions, keeping for compatibility
    const response = await fetch(`${this.baseUrl}/users/${this.currentSessionId}`);

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.user;
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  // Check if we have a current session ID
  hasCurrentSession(): boolean {
    return this.currentSessionId !== null;
  }

  setCurrentSessionId(sessionId: string): void {
    this.currentSessionId = sessionId;
  }

  // Complete registration and save to MongoDB
  async completeRegistration(): Promise<any> {
    if (!this.currentSessionId) {
      throw new Error('No session ID available');
    }

    const response = await fetch(`${this.baseUrl}/users/${this.currentSessionId}/complete-registration`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to complete registration');
    }

    return await response.json();
  }

  // Verify voter credentials for voting day
  verifyVoter(emailCode: string, nationalInsurance: string, totpCode: string): Observable<VoterVerificationResponse> {
    return new Observable(observer => {
      fetch(`${this.baseUrl}/verify-voter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          emailCode,
          nationalInsurance,
          totpCode
        })
      })
      .then(response => {
        if (!response.ok) {
          return response.json().then(error => {
            throw error;
          });
        }
        return response.json();
      })
      .then(data => {
        observer.next(data);
        observer.complete();
      })
      .catch(error => {
        observer.error(error);
      });
    });
  }

  // Submit vote
  async submitVote(ballotToken: string, memberOfParliament: string, localCouncil: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/submit-vote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ballotToken,
        memberOfParliament,
        localCouncil
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to submit vote');
    }

    return await response.json();
  }

  // Get candidates for a specific constituency
  async getCandidatesByConstituency(constituency: string): Promise<any> {
    const response = await fetch(`${this.baseUrl}/candidates/${constituency}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get candidates');
    }

    return await response.json();
  }
}
