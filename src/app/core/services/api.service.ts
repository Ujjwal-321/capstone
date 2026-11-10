import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse, Capsule, Emoji, HistoryQuery, Moment, Page, Place, PlaceStat, Reflection,
  SealCapsuleRequest, Streak, Summary, TimeOfDayStat, TrendPoint, UpdateProfileRequest,
  UserProfile, YearlyRecap
} from '../models';

const API = environment.apiBase;

/** Unwraps the backend's {success, message, data} envelope. */
const data = <T>() => map((res: ApiResponse<T>) => res.data);

function params(values: Record<string, string | number | boolean | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
  }
  return p;
}

/**
 * Every MoodCapsule endpoint the web app uses, in one place.
 * The web is a "reflection desk": it reads moments but never creates them (that's the phone's job).
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private emojis$?: Observable<Emoji[]>;

  // ─── Profile ──────────────────────────────────────────────
  me(): Observable<UserProfile> {
    return this.http.get<ApiResponse<UserProfile>>(`${API}/users/me`).pipe(data());
  }

  updateMe(body: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.put<ApiResponse<UserProfile>>(`${API}/users/me`, body).pipe(data());
  }

  deleteMe(password: string): Observable<string> {
    return this.http.delete<ApiResponse<unknown>>(`${API}/users/me`, { body: { password } })
      .pipe(map(res => res.message));
  }

  exportCsv(): Observable<Blob> {
    return this.http.get(`${API}/users/me/export`, { responseType: 'blob' });
  }

  // ─── Emojis & places ──────────────────────────────────────
  /** The emoji list never changes while the app is open, so it's fetched once. */
  emojis(): Observable<Emoji[]> {
    this.emojis$ ??= this.http.get<ApiResponse<Emoji[]>>(`${API}/emojis`).pipe(data(), shareReplay(1));
    return this.emojis$;
  }

  places(includeArchived = false): Observable<Place[]> {
    return this.http.get<ApiResponse<Place[]>>(`${API}/places`, { params: params({ includeArchived }) })
      .pipe(data());
  }

  addPlace(name: string, icon?: string): Observable<Place> {
    return this.http.post<ApiResponse<Place>>(`${API}/places`, { name, icon }).pipe(data());
  }

  archivePlace(placeId: number): Observable<Place> {
    return this.http.put<ApiResponse<Place>>(`${API}/places/${placeId}/archive`, {}).pipe(data());
  }

  // ─── Moments (read-only on the web) ───────────────────────
  todayMoments(): Observable<Moment[]> {
    return this.http.get<ApiResponse<Moment[]>>(`${API}/moods/today/moments`).pipe(data());
  }

  history(q: HistoryQuery): Observable<Page<Moment>> {
    return this.http.get<ApiResponse<Page<Moment>>>(`${API}/moods/history`, {
      params: params({ ...q })
    }).pipe(data());
  }

  reflections(startDate?: string, endDate?: string): Observable<Reflection[]> {
    return this.http.get<ApiResponse<Reflection[]>>(`${API}/reflections`, { params: params({ startDate, endDate }) })
      .pipe(data());
  }

  // ─── Stats ────────────────────────────────────────────────
  summary(): Observable<Summary> {
    return this.http.get<ApiResponse<Summary>>(`${API}/stats/summary`).pipe(data());
  }

  /** One point per logged day, oldest first. days = 1…366, counted back from the user's today. */
  trend(days: number): Observable<TrendPoint[]> {
    return this.http.get<ApiResponse<TrendPoint[]>>(`${API}/stats/trend`, { params: params({ days }) })
      .pipe(data());
  }

  streak(): Observable<Streak> {
    return this.http.get<ApiResponse<Streak>>(`${API}/stats/streak`).pipe(data());
  }

  byPlace(days = 30): Observable<PlaceStat[]> {
    return this.http.get<ApiResponse<PlaceStat[]>>(`${API}/stats/by-place`, { params: params({ days }) })
      .pipe(data());
  }

  byTimeOfDay(days = 30): Observable<TimeOfDayStat[]> {
    return this.http.get<ApiResponse<TimeOfDayStat[]>>(`${API}/stats/by-time-of-day`, { params: params({ days }) })
      .pipe(data());
  }

  recap(year?: number): Observable<YearlyRecap> {
    return this.http.get<ApiResponse<YearlyRecap>>(`${API}/stats/recap`, { params: params({ year }) })
      .pipe(data());
  }

  // ─── Time capsules ────────────────────────────────────────
  capsules(): Observable<Capsule[]> {
    return this.http.get<ApiResponse<Capsule[]>>(`${API}/capsules`).pipe(data());
  }

  sealCapsule(body: SealCapsuleRequest): Observable<Capsule> {
    return this.http.post<ApiResponse<Capsule>>(`${API}/capsules`, body).pipe(data());
  }

  openCapsule(capsuleId: number): Observable<Capsule> {
    return this.http.post<ApiResponse<Capsule>>(`${API}/capsules/${capsuleId}/open`, {}).pipe(data());
  }

  // ─── Admin ────────────────────────────────────────────────
  adminUsers(keyword: string, page: number, size = 10): Observable<SpringPage<UserProfile & { active?: boolean }>> {
    return this.http.get<ApiResponse<SpringPage<UserProfile & { active?: boolean }>>>(`${API}/admin/users`, {
      params: params({ keyword, page, size })
    }).pipe(data());
  }

  deactivateUser(userId: number): Observable<string> {
    return this.http.put<ApiResponse<unknown>>(`${API}/admin/users/${userId}/deactivate`, {}).pipe(map(r => r.message));
  }

  reactivateUser(userId: number): Observable<string> {
    return this.http.put<ApiResponse<unknown>>(`${API}/admin/users/${userId}/reactivate`, {}).pipe(map(r => r.message));
  }
}

/** Spring Data's Page JSON (used by the admin list). */
export interface SpringPage<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}
