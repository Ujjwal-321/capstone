import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  ApiResponse, EmojiResponse, MoodEntryCreateRequest, MoodEntryResponse,
  MoodHistoryResponse, MoodSummaryResponse, MoodTrendPointResponse,
  StreakResponse, YearlyRecapResponse, UserProfileResponse,
  UpdateProfileRequest, PageResponse
} from '../models';
import { API_BASE } from './auth.service';

// ─── Emoji Service ───────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class EmojiService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<ApiResponse<EmojiResponse[]>>(`${API_BASE}/emojis`);
  }
}

// ─── Mood Entry Service ──────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class MoodService {
  constructor(private http: HttpClient) {}

  createEntry(payload: MoodEntryCreateRequest) {
    return this.http.post<ApiResponse<MoodEntryResponse>>(
      `${API_BASE}/moods`, payload
    );
  }

  getTodayEntry() {
    return this.http.get<ApiResponse<MoodEntryResponse>>(`${API_BASE}/moods/today`);
  }

  getHistory(params: {
    startDate?:  string;
    endDate?:    string;
    emojiId?:    number;
    keyword?:    string;
    page?:       number;
    size?:       number;
  }) {
    let httpParams = new HttpParams();
    if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
    if (params.endDate)   httpParams = httpParams.set('endDate',   params.endDate);
    if (params.emojiId)   httpParams = httpParams.set('emojiId',   params.emojiId.toString());
    if (params.keyword)   httpParams = httpParams.set('keyword',   params.keyword);
    if (params.page !== undefined) httpParams = httpParams.set('page', params.page.toString());
    if (params.size !== undefined) httpParams = httpParams.set('size', params.size.toString());

    return this.http.get<ApiResponse<MoodHistoryResponse>>(
      `${API_BASE}/moods/history`, { params: httpParams }
    );
  }
}

// ─── Stats Service ───────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class StatsService {
  constructor(private http: HttpClient) {}

  getSummary() {
    return this.http.get<ApiResponse<MoodSummaryResponse>>(`${API_BASE}/stats/summary`);
  }

  getTrend(days: number = 7) {
    return this.http.get<ApiResponse<MoodTrendPointResponse[]>>(
      `${API_BASE}/stats/trend`, { params: { days: days.toString() } }
    );
  }

  getStreak() {
    return this.http.get<ApiResponse<StreakResponse>>(`${API_BASE}/stats/streak`);
  }

  getRecap(year?: number) {
    const params: { [key: string]: string } = {};
    if (year) params['year'] = year.toString();
    return this.http.get<ApiResponse<YearlyRecapResponse>>(
      `${API_BASE}/stats/recap`, { params }
    );
  }
}

// ─── User Service ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  getProfile() {
    return this.http.get<ApiResponse<UserProfileResponse>>(`${API_BASE}/users/me`);
  }

  updateProfile(payload: UpdateProfileRequest) {
    return this.http.put<ApiResponse<UserProfileResponse>>(
      `${API_BASE}/users/me`, payload
    );
  }
}

// ─── Admin Service ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class AdminService {
  constructor(private http: HttpClient) {}

  getUsers(keyword: string = '', page: number = 0, size: number = 10) {
    return this.http.get<ApiResponse<PageResponse<UserProfileResponse>>>(
      `${API_BASE}/admin/users`,
      { params: { keyword, page: page.toString(), size: size.toString() } }
    );
  }

  deactivateUser(userId: number) {
    return this.http.put<ApiResponse<null>>(
      `${API_BASE}/admin/users/${userId}/deactivate`, {}
    );
  }

  reactivateUser(userId: number) {
    return this.http.put<ApiResponse<null>>(
      `${API_BASE}/admin/users/${userId}/reactivate`, {}
    );
  }
}

// ─── Toast Service ────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts: { id: string; type: string; message: string }[] = [];

  get toasts() { return this._toasts; }

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration = 3500) {
    const id = Math.random().toString(36).slice(2);
    this._toasts.push({ id, type, message });
    setTimeout(() => this.remove(id), duration);
  }

  success(msg: string) { this.show(msg, 'success'); }
  error(msg: string)   { this.show(msg, 'error', 5000); }
  info(msg: string)    { this.show(msg, 'info'); }
  warning(msg: string) { this.show(msg, 'warning'); }

  remove(id: string) {
    this._toasts = this._toasts.filter(t => t.id !== id);
  }
}
