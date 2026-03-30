import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap, catchError, throwError } from 'rxjs';
import {
  AuthResponse, LoginRequest, RegisterRequest,
  RefreshTokenRequest, VerifyEmailRequest,
  ForgotPasswordRequest, ResetPasswordRequest,
  ApiResponse
} from '../models';

export const API_BASE = 'http://localhost:8080/api';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY   = 'mc_access_token';
  private readonly REFRESH_KEY = 'mc_refresh_token';
  private readonly USER_KEY    = 'mc_user';

  private _user = signal<AuthResponse | null>(this.loadUser());
  readonly user = this._user.asReadonly();
  readonly isAuth = computed(() => !!this._user());
  readonly isAdmin = computed(() => this._user()?.role === 'ADMIN');

  constructor(private http: HttpClient, private router: Router) {}

  register(payload: RegisterRequest) {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${API_BASE}/auth/register`, payload
    );
  }

  login(payload: LoginRequest) {
    return this.http.post<ApiResponse<AuthResponse>>(
      `${API_BASE}/auth/login`, payload
    ).pipe(
      tap(res => this.persistSession(res.data))
    );
  }

  refresh() {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return throwError(() => new Error('No refresh token'));

    return this.http.post<ApiResponse<AuthResponse>>(
      `${API_BASE}/auth/refresh`, { refreshToken } as RefreshTokenRequest
    ).pipe(
      tap(res => this.persistSession(res.data)),
      catchError(err => {
        this.clearSession();
        this.router.navigate(['/auth/login']);
        return throwError(() => err);
      })
    );
  }

  logout() {
    const refreshToken = this.getRefreshToken();
    if (refreshToken) {
      this.http.post<ApiResponse<null>>(
        `${API_BASE}/auth/logout`, { refreshToken }
      ).subscribe({ error: () => {} });
    }

    this.clearSession();
    this.router.navigate(['/auth/login']);
  }

  verifyEmail(payload: VerifyEmailRequest) {
    return this.http.post<ApiResponse<null>>(
      `${API_BASE}/auth/verify-email`, payload
    );
  }

  forgotPassword(payload: ForgotPasswordRequest) {
    return this.http.post<ApiResponse<null>>(
      `${API_BASE}/auth/forgot-password`, payload
    );
  }

  resetPassword(payload: ResetPasswordRequest) {
    return this.http.post<ApiResponse<null>>(
      `${API_BASE}/auth/reset-password`, payload
    );
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.REFRESH_KEY);
  }

  getCurrentUser(): AuthResponse | null {
    return this._user();
  }

  getUserName(): string {
    const user = this._user();

    return (
      (user as any)?.fullName ||
      (user as any)?.name ||
      (user as any)?.email ||
      'there'
    );
  }

  private persistSession(auth: AuthResponse) {
    localStorage.setItem(this.TOKEN_KEY, auth.accessToken);
    localStorage.setItem(this.REFRESH_KEY, auth.refreshToken);
    localStorage.setItem(this.USER_KEY, JSON.stringify(auth));
    this._user.set(auth);
  }

  private clearSession() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_KEY);
    localStorage.removeItem(this.USER_KEY);
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
}