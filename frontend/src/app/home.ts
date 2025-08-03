import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  personalForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.personalForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
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
    // Implement email authentication setup
  }

  setupAuthenticatorApp() {
    console.log('Setting up authenticator app...');
    // Implement authenticator app setup
  }

  proceedToVoting() {
    if (this.personalForm.valid) {
      console.log('Proceeding to voting...');
      // Navigate to voting page or next step
    }
  }
}
