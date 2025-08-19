import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-vote-login',
  templateUrl: './vote-login.html',
  styleUrls: ['./vote-login.css'],
  standalone: true,
  imports: []
})
export class VoteLoginComponent {
  
  constructor(private router: Router) {}

  ngOnInit() {
    // Add any initialization logic here if needed
    console.log('Vote Login page loaded');
  }

  onLoginClick() {
    // Navigate to the voter verification page
    console.log('Navigating to voter verification');
    this.router.navigate(['/voter-verification']);
  }
}
