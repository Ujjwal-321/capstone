import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/** Signed-in users only; everyone else goes to the login page (and comes back afterwards). */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  if (auth.isAuth()) return true;
  return inject(Router).createUrlTree(['/auth/login'], {
    queryParams: state.url && state.url !== '/' ? { returnUrl: state.url } : {}
  });
};

/** Login/register pages are skipped when you're already signed in. */
export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAuth() ? inject(Router).createUrlTree(['/overview']) : true;
};

export const adminGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.isAdmin() ? true : inject(Router).createUrlTree(['/overview']);
};
