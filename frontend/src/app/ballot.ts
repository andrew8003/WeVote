import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-ballot',
  templateUrl: './ballot.html',
  styleUrls: ['./ballot.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class BallotComponent implements OnInit {
  ballotForm: FormGroup;
  isSubmitting = false;
  voterInfo: any = null;
  ballotToken: string | null = null;
  candidates: any = null;
  isLoadingCandidates = true;
  constituency: string = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService,
    private titleService: Title
  ) {
    this.ballotForm = this.formBuilder.group({
      mpChoice: ['', Validators.required],
      councilChoice: ['', Validators.required]
    });
  }

  async ngOnInit() {
    this.titleService.setTitle('WeVote - Cast Your Vote');
    
    // Check if voter has valid ballot access
    this.ballotToken = sessionStorage.getItem('ballotToken');
    const voterInfoStr = sessionStorage.getItem('voterInfo');
    
    if (!this.ballotToken || !voterInfoStr) {
      // No valid ballot access, redirect to verification
      alert('Invalid ballot access. Please complete voter verification first.');
      this.router.navigate(['/voter-verification']);
      return;
    }

    try {
      this.voterInfo = JSON.parse(voterInfoStr);
      console.log('Ballot access granted for voter:', this.voterInfo);
      
      // Extract constituency from voter's postcode (first 3 characters)
      this.constituency = this.voterInfo.postcode.substring(0, 3).toUpperCase();
      console.log('Voter constituency:', this.constituency);
      
      // Load candidates for this constituency
      await this.loadCandidates();
      
    } catch (error) {
      console.error('Error setting up ballot:', error);
      alert('Error loading ballot. Please try again.');
      this.router.navigate(['/voter-verification']);
    }
  }

  async loadCandidates() {
    try {
      this.isLoadingCandidates = true;
      const response = await this.userService.getCandidatesByConstituency(this.constituency);
      this.candidates = response.candidates;
      console.log('Loaded candidates for', this.constituency, ':', this.candidates);
    } catch (error: any) {
      console.error('Error loading candidates:', error);
      alert(`Error loading candidates: ${error.message}. Please try again.`);
      this.router.navigate(['/voter-verification']);
    } finally {
      this.isLoadingCandidates = false;
    }
  }

  getCandidateName(candidateId: string): string {
    if (!this.candidates || !this.candidates.memberOfParliament) {
      return 'Loading...';
    }
    
    const candidate = this.candidates.memberOfParliament.find((c: any) => c.candidateId === candidateId);
    return candidate ? `${candidate.name} (${candidate.party})` : 'Unknown Candidate';
  }

  getCouncilCandidateName(candidateId: string): string {
    if (!this.candidates || !this.candidates.localCouncil) {
      return 'Loading...';
    }
    
    const candidate = this.candidates.localCouncil.find((c: any) => c.candidateId === candidateId);
    return candidate ? `${candidate.name} (${candidate.party})` : 'Unknown Candidate';
  }

  async onSubmitBallot() {
    if (this.ballotForm.valid && this.ballotToken) {
      this.isSubmitting = true;
      
      const mpChoice = this.ballotForm.get('mpChoice')?.value;
      const councilChoice = this.ballotForm.get('councilChoice')?.value;
      
      try {
        console.log('Submitting ballot:', {
          ballotToken: this.ballotToken,
          memberOfParliament: mpChoice,
          localCouncil: councilChoice
        });

        // Submit vote to backend API
        const result = await this.userService.submitVote(
          this.ballotToken,
          mpChoice,
          councilChoice
        );

        console.log('Vote submission successful:', result);
        
        // Clear ballot access data
        sessionStorage.removeItem('ballotToken');
        sessionStorage.removeItem('voterInfo');
        
        // Store the result for the completion page
        sessionStorage.setItem('voteResult', JSON.stringify(result));
        
        // Redirect to confirmation page
        this.router.navigate(['/vote-complete']);

      } catch (error: any) {
        console.error('Error submitting vote:', error);
        this.isSubmitting = false;
        alert(`Error submitting vote: ${error.message || 'Please try again.'}`);
      }
      
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.ballotForm.controls).forEach(key => {
        this.ballotForm.get(key)?.markAsTouched();
      });
      
      alert('Please make selections for all races before submitting your ballot.');
    }
  }

  goBack() {
    // Clear current ballot access and return to verification
    sessionStorage.removeItem('ballotToken');
    sessionStorage.removeItem('voterInfo');
    this.router.navigate(['/voter-verification']);
  }
}
