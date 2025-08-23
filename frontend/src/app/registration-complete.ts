import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registration-complete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './registration-complete.html',
  styleUrls: ['./registration-complete.css']
})
export class RegistrationCompleteComponent implements OnInit {
  
  constructor(private router: Router, private titleService: Title) {}

  ngOnInit() {
    this.titleService.setTitle('WeVote - Registration Complete');
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
