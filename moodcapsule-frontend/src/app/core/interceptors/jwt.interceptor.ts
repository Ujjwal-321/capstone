import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const jwtInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const token = auth.getAccessToken();

  // Public endpoints — skip token
  const isPublic = req.url.includes('/auth/login')
    || req.url.includes('/auth/register')
    || req.url.includes('/auth/forgot-password')
    || req.url.includes('/auth/reset-password')
    || req.url.includes('/auth/verify-email');

  if (!token || isPublic) {
    return next(req);
  }

  const authReq = addToken(req, token);

  return next(authReq).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.includes('/auth/refresh')) {
        return auth.refresh().pipe(
          switchMap(() => {
            const newToken = auth.getAccessToken();
            return next(addToken(req, newToken!));
          }),
          catchError(refreshErr => {
            auth.logout();
            return throwError(() => refreshErr);
          })
        );
      }
      return throwError(() => err);
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
}
