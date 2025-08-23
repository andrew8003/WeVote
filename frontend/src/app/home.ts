import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-home',
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  personalForm: FormGroup;
  generalError: string = '';

  constructor(
    private fb: FormBuilder, 
    private userService: UserService, 
    private router: Router,
    private titleService: Title
  ) {
    this.personalForm = this.fb.group({
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      postcode: ['', [Validators.required, Validators.pattern(/^[A-Z]{1,2}[0-9R][0-9A-Z]? [0-9][ABD-HJLNP-UW-Z]{2}$/i)]],
      nationalInsurance: ['', [
        Validators.required, 
        this.nationalInsuranceValidator
      ]]
    });
  }

  ngOnInit() {
    this.titleService.setTitle('WeVote - Voter Registration');
    
    // Clear errors when user starts typing
    this.personalForm.valueChanges.subscribe(() => {
      if (this.generalError) {
        this.generalError = '';
      }
    });
  }

  // Custom validator for National Insurance number
  nationalInsuranceValidator(control: any) {
    if (!control.value) {
      return null; // Let required validator handle empty values
    }

    // Remove any spaces and convert to uppercase
    const cleanValue = control.value.replace(/\s+/g, '').toUpperCase();
    
    // Check format: 2 letters + 6 numbers + 1 letter (9 characters total)
    const niPattern = /^[A-Z]{2}[0-9]{6}[A-Z]$/;
    
    if (!niPattern.test(cleanValue)) {
      return { invalidNationalInsurance: true };
    }

    // Additional check to exclude invalid first letters (I, O, U are not used)
    const firstLetter = cleanValue.charAt(0);
    const secondLetter = cleanValue.charAt(1);
    
    if (['I', 'O', 'U'].includes(firstLetter) || 
        ['I', 'O', 'U'].includes(secondLetter)) {
      return { invalidNationalInsurance: true };
    }

    return null; // Valid
  }

  async onSubmitPersonalDetails() {
    if (this.personalForm.valid) {
      try {
        // Clear any previous errors
        this.generalError = '';
        
        console.log('Personal details submitted:', this.personalForm.value);
        
        // Clean the National Insurance number before sending
        const formData = { ...this.personalForm.value };
        if (formData.nationalInsurance) {
          formData.nationalInsurance = formData.nationalInsurance.replace(/\s+/g, '').toUpperCase();
        }
        
        // Save to database
        const result = await this.userService.createUser(formData);
        console.log('User created/updated:', result);
        
        // Navigate to authentication page
        this.router.navigate(['/auth']);
        
      } catch (error) {
        console.error('Error saving personal details:', error);
        this.generalError = 'Failed to save personal details. Please try again.';
      }
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.personalForm.controls).forEach(key => {
        this.personalForm.get(key)?.markAsTouched();
      });
    }
  }
}
