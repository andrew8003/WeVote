import { Routes } from '@angular/router';
import { App } from './app';
import { SecondPageComponent } from './second-page';

export const routes: Routes = [
  { path: '', component: App },
  { path: 'second', component: SecondPageComponent }
];
