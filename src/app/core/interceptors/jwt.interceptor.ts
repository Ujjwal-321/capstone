import { HttpErrorResponse, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../services/auth.service';

/** Endpoints that never need (or must not get) the access token. */
const PUBLIC = ['/auth/login', '/auth/register', '/auth/google', '/auth/refresh', '/auth/forgot-password',
  '/auth/reset-password', '/auth/verify-email', '/auth/resend-verification'];

/**
 * Adds "Authorization: Bearer …" to MoodCapsule API calls. On a 401 it refreshes the
 * token once (shared by all requests that failed together) and retries.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isApi = req.url.startsWith(environment.apiBase);
  const isPublic = PUBLIC.some(path => req.url.includes(path));
  const token = auth.getAccessToken();

  if (!isApi || isPublic || !token) return next(req);

  return next(withToken(req, token)).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status !== 401) return throwError(() => err);
      return auth.refresh().pipe(
        switchMap(() => next(withToken(req, auth.getAccessToken() ?? ''))),
        catchError(() => throwError(() => err))
      );
    })
  );
};

function withToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
