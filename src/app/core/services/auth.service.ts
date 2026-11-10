import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, map, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse, AuthResponse, LoginRequest, RegisterRequest, ResetPasswordRequest, VerifyEmailCodeRequest
} from '../models';

const API = environment.apiBase;

/** Signed-in user and tokens (kept in localStorage so a refresh doesn't log you out). */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private readonly TOKEN_KEY = 'mc_access_token';
  private readonly REFRESH_KEY = 'mc_refresh_token';
  private readonly USER_KEY = 'mc_user';

  private readonly _user = signal<AuthResponse | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isAuth = computed(() => !!this._user() && !!this.getRefreshToken());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');
  readonly firstName = computed(() => (this._user()?.fullName ?? '').trim().split(/\s+/)[0] || 'there');

  /** One refresh at a time: requests that hit 401 together share it. */
  private refreshing$: Observable<AuthResponse> | null = null;

  register(body: RegisterRequest): Observable<ApiResponse<AuthResponse>> {
    return this.http.post<ApiResponse<AuthResponse>>(`${API}/auth/register`, body);
  }

  login(body: LoginRequest): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${API}/auth/login`, { ...body, deviceInfo: this.deviceInfo() })
      .pipe(map(r => r.data), tap(a => this.saveSession(a)));
  }

  /** MC-69: exchange a Google ID token (from Google's button) for a MoodCapsule session. */
  loginWithGoogle(idToken: string): Observable<AuthResponse> {
    return this.http.post<ApiResponse<AuthResponse>>(`${API}/auth/google`, { idToken, deviceInfo: this.deviceInfo() })
      .pipe(map(r => r.data), tap(a => this.saveSession(a)));
  }

  verifyEmailCode(body: VerifyEmailCodeRequest): Observable<string> {
    return this.http.post<ApiResponse<unknown>>(`${API}/auth/verify-email/code`, body).pipe(map(r => r.message));
  }

  resendVerification(email: string): Observable<string> {
    return this.http.post<ApiResponse<unknown>>(`${API}/auth/resend-verification`, { email }).pipe(map(r => r.message));
  }

  forgotPassword(email: string): Observable<string> {
    return this.http.post<ApiResponse<unknown>>(`${API}/auth/forgot-password`, { email }).pipe(map(r => r.message));
  }

  resetPassword(body: ResetPasswordRequest): Observable<string> {
    return this.http.post<ApiResponse<unknown>>(`${API}/auth/reset-password`, body).pipe(map(r => r.message));
  }

  refresh(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    this.refreshing$ ??= this.http.post<ApiResponse<AuthResponse>>(`${API}/auth/refresh`, { refreshToken }).pipe(
      map(r => r.data),
      tap(a => this.saveSession(a)),
      catchError(err => {
        this.clearSession();
        this.router.navigate(['/auth/login'], { queryParams: { expired: 1 } });
        return throwError(() => err);
      }),
      finalize(() => (this.refreshing$ = null)),
      shareReplay(1)
    );
    return this.refreshing$;
  }

  logout(): void {
    const refreshToken = this.getRefreshToken();
    if (refreshToken && this.getAccessToken()) {
      this.http.post(`${API}/auth/logout`, { refreshToken }).subscribe({ error: () => {} });
    }
    this.clearSession();
    // Stop Google from signing the same account straight back in
    (window as any).google?.accounts?.id?.disableAutoSelect?.();
    this.router.navigate(['/auth/login']);
  }

  /** After a profile change (e.g. new name) keep the sidebar in sync. */
  updateUser(patch: Partial<AuthResponse>): void {
    const current = this._user();
    if (!current) return;
    const next = { ...current, ...patch };
    localStorage.setItem(this.USER_KEY, JSON.stringify(next));
    this._user.set(next);
  }

  /** Called after the account is deleted. */
  forget(): void {
    this.clearSession();
  }

  getAccessToken(): string | null {
    return this.read(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return this.read(this.REFRESH_KEY);
  }

  private saveSession(auth: AuthResponse): void {
    try {
      if (auth.accessToken) localStorage.setItem(this.TOKEN_KEY, auth.accessToken);
      if (auth.refreshToken) localStorage.setItem(this.REFRESH_KEY, auth.refreshToken);
      const { accessToken, refreshToken, ...user } = auth;
      localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    } catch { /* private mode – the session lasts until the tab closes */ }
    this._user.set(auth);
  }

  private clearSession(): void {
    try {
      localStorage.removeItem(this.TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_KEY);
      localStorage.removeItem(this.USER_KEY);
    } catch { /* ignore */ }
    this._user.set(null);
  }

  private loadUser(): AuthResponse | null {
    try {
      const raw = localStorage.getItem(this.USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private read(key: string): string | null {
    try { return localStorage.getItem(key); } catch { return null; }
  }

  private deviceInfo(): string {
    const ua = navigator.userAgent;
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox'
      : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    const os = /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'macOS' : /Android/.test(ua) ? 'Android'
      : /iPhone|iPad/.test(ua) ? 'iOS' : /Linux/.test(ua) ? 'Linux' : '';
    return `Web · ${browser}${os ? ' on ' + os : ''}`;
  }
}
