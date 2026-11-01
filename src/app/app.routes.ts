import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'currency' },
  {
    path: 'currency',
    title: 'Currency converter | Finances',
    loadComponent: () => import('./features/currency/currency').then((m) => m.Currency),
  },
  {
    path: 'mortgage',
    title: 'Mortgage calculator | Finances',
    loadComponent: () => import('./features/mortgage/mortgage').then((m) => m.Mortgage),
  },
  {
    path: 'bonds',
    title: 'Bonds calculator | Finances',
    loadComponent: () => import('./features/bonds/bonds').then((m) => m.Bonds),
  },
  { path: '**', redirectTo: 'currency' },
];
