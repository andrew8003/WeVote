import { Routes } from '@angular/router';
import { HomeComponent } from './home';
import { AuthComponent } from './auth';
import { SecondPageComponent } from './second-page';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'auth', component: AuthComponent },
  { path: 'second', component: SecondPageComponent }
];
