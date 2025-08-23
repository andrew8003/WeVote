import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { UserService } from './services/user.service';

@Component({
  selector: 'app-voter-verification',
  templateUrl: './voter-verification.html',
  styleUrls: ['./voter-verification.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule]
})
export class VoterVerificationComponent implements OnInit {
  verificationForm: FormGroup;
  isVerifying = false;
  verificationError = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService,
    private titleService: Title
  ) {
    this.verificationForm = this.formBuilder.group({
      emailCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
      nationalInsurance: ['', [Validators.required, this.nationalInsuranceValidator]],
      totpCode: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]]
    });
  }

  ngOnInit() {
    this.titleService.setTitle('WeVote - Voter Verification');
    console.log('Voter verification page loaded');
  }

  // Custom validator for National Insurance number
  nationalInsuranceValidator(control: any) {
    if (!control.value) return null;
    
    const ni = control.value.toUpperCase().replace(/\s/g, '');
    
    // Various UK NI number formats
    const patterns = [
      /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\d{6}[A-D]$/,  // Standard format
      /^[A-CEGHJ-PR-TW-Z][A-CEGHJ-NPR-TW-Z]\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]$/  // With spaces
    ];
    
    const isValid = patterns.some(pattern => pattern.test(ni));
    return isValid ? null : { invalidNI: true };
  }

  onSubmitVerification() {
    if (this.verificationForm.valid) {
      this.isVerifying = true;
      this.verificationError = ''; // Clear previous errors
      
      const formData = this.verificationForm.value;
      console.log('Verification form submitted:', {
        emailCode: formData.emailCode,
        nationalInsurance: formData.nationalInsurance.toUpperCase(),
        totpCode: formData.totpCode
      });

      // Call the voter verification API
      this.userService.verifyVoter(
        formData.emailCode,
        formData.nationalInsurance,
        formData.totpCode
      ).subscribe({
        next: (response) => {
          console.log('Voter verification successful:', response);
          this.isVerifying = false;
          
          // Store ballot token and voter info for the ballot page
          sessionStorage.setItem('ballotToken', response.ballotToken);
          sessionStorage.setItem('voterInfo', JSON.stringify(response.voter));
          
          // Navigate to ballot page
          this.router.navigate(['/ballot']);
        },
        error: (error) => {
          console.error('Voter verification failed:', error);
          this.isVerifying = false;
          
          // Show error message to user
          const errorMessage = error.error?.error || 'Verification failed. Please check your credentials and try again.';
          this.verificationError = errorMessage;
        }
      });
      
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.verificationForm.controls).forEach(key => {
        this.verificationForm.get(key)?.markAsTouched();
      });
    }
  }

  goBack() {
    this.router.navigate(['/vote-login']);
  }
}
