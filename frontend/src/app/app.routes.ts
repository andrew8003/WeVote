import { Routes } from '@angular/router';
import { HomeComponent } from './home';
import { SecondPageComponent } from './second-page';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'second', component: SecondPageComponent }
];
