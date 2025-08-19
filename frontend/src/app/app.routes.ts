import { Routes } from '@angular/router';
import { HomeComponent } from './home';
import { AuthComponent } from './auth';
import { RegistrationCompleteComponent } from './registration-complete';
import { VoteLoginComponent } from './vote-login';
import { VoterVerificationComponent } from './voter-verification';
import { BallotComponent } from './ballot';
import { VoteCompleteComponent } from './vote-complete';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'registration-complete', component: RegistrationCompleteComponent },
  { path: 'vote-login', component: VoteLoginComponent },
  { path: 'voter-verification', component: VoterVerificationComponent },
  { path: 'ballot', component: BallotComponent },
  { path: 'vote-complete', component: VoteCompleteComponent }
];
