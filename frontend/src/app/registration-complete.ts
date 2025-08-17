import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registration-complete',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './registration-complete.html',
  styleUrls: ['./registration-complete.css']
})
export class RegistrationCompleteComponent {
  
  constructor(private router: Router) {}

  goToHome() {
    this.router.navigate(['/']);
  }
}
