import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-vote-login',
  templateUrl: './vote-login.html',
  styleUrls: ['./vote-login.css'],
  standalone: true,
  imports: []
})
export class VoteLoginComponent implements OnInit {
  
  constructor(private router: Router, private titleService: Title) {}

  ngOnInit() {
    this.titleService.setTitle('WeVote - Voter Login');
    console.log('Vote Login page loaded');
  }

  onLoginClick() {
    // Navigate to the voter verification page
    console.log('Navigating to voter verification');
    this.router.navigate(['/voter-verification']);
  }
}
