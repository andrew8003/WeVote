import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-vote-complete',
  templateUrl: './vote-complete.html',
  styleUrls: ['./vote-complete.css'],
  standalone: true,
  imports: [CommonModule]
})
export class VoteCompleteComponent implements OnInit {
  submissionTime: string = '';
  ballotId: string = '';
  voteResult: any = null;

  constructor(private router: Router, private titleService: Title) {}

  ngOnInit() {
    this.titleService.setTitle('WeVote - Vote Confirmed');
    
    // Auto-scroll to top of page
    window.scrollTo(0, 0);
    
    // Get the vote result from session storage
    const voteResultStr = sessionStorage.getItem('voteResult');
    
    if (voteResultStr) {
      try {
        this.voteResult = JSON.parse(voteResultStr);
        this.ballotId = this.voteResult.ballotId || 'BLT-UNKNOWN';
        this.submissionTime = new Date(this.voteResult.timestamp).toLocaleString('en-GB', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } catch (error) {
        console.error('Error parsing vote result:', error);
        this.setDefaultValues();
      }
    } else {
      console.warn('No vote result found in session storage');
      this.setDefaultValues();
    }

    console.log('Vote completion page loaded with result:', this.voteResult);
  }

  private setDefaultValues() {
    // Set default values if no vote result available
    this.submissionTime = new Date().toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    this.ballotId = 'BLT-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }

  returnToHome() {
    // Clear any remaining session data including vote result
    sessionStorage.clear();
    
    // Navigate back to the home page
    this.router.navigate(['/']);
  }

  printConfirmation() {
    // Trigger browser print dialog
    window.print();
  }
}
