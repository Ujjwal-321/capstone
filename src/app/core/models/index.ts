// Shapes returned by the MoodCapsule backend. Dates are 'yyyy-MM-dd', times 'HH:mm:ss'
// (the user's time zone), date-times ISO 'yyyy-MM-ddTHH:mm:ss'.

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// ─── Auth ───────────────────────────────────────────────────
export interface AuthResponse {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  expiresIn: number | null;
  userId: number;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
}

export interface LoginRequest { email: string; password: string; deviceInfo?: string; }
export interface RegisterRequest { fullName: string; email: string; password: string; }
export interface GoogleLoginRequest { idToken: string; deviceInfo?: string; }
export interface VerifyEmailCodeRequest { email: string; code: string; }
export interface ResetPasswordRequest { email: string; token: string; newPassword: string; }

// ─── User ───────────────────────────────────────────────────
export type ThemePreference = 'LIGHT' | 'DARK' | 'SYSTEM';

export interface UserProfile {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  themePreference: ThemePreference;
  reminderAllowed: boolean;
  reminderTime: string | null;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
  timezone: string | null;
}

export interface UpdateProfileRequest {
  fullName?: string;
  avatarUrl?: string | null;
  bio?: string | null;
  themePreference?: ThemePreference;
  reminderAllowed?: boolean;
  reminderTime?: string | null;
  timezone?: string;
}

// ─── Moments ────────────────────────────────────────────────
export interface Emoji {
  emojiId: number;
  symbol: string;
  description: string;
  moodScore: number;
}

export interface Moment {
  entryId: number;
  emojiId: number;
  emojiSymbol: string;
  emojiDescription: string;
  moodScore: number;
  entryText: string;
  insightText: string | null;
  entryDate: string;
  createdAt: string;
  placeId: number | null;
  placeName: string | null;
  placeIcon: string | null;
  entryTime: string | null;
}

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface HistoryQuery {
  startDate?: string;
  endDate?: string;
  emojiId?: number;
  placeId?: number;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface Place {
  placeId: number;
  name: string;
  icon: string;
  preset: boolean;
  archived: boolean;
}

export interface Reflection {
  reflectionId: number;
  reflectionDate: string;
  text: string;
  createdAt: string;
}

// ─── Stats ──────────────────────────────────────────────────
export interface Summary {
  totalEntries: number;
  daysLogged: number;
  averageMoodScore: number | null;
  averageMoodLabel: string | null;
  mostUsedMood: string | null;
}

export interface TrendPoint {
  date: string;
  moodScore: number;
  averageScore: number;
  count: number;
  emojiSymbol: string;
  emojiDescription: string;
}

export interface Streak { currentStreak: number; longestStreak: number; }

export interface PlaceStat {
  placeId: number;
  placeName: string;
  placeIcon: string;
  averageScore: number | null;
  count: number;
}

export interface TimeOfDayStat {
  period: 'MORNING' | 'AFTERNOON' | 'EVENING' | 'NIGHT';
  label: string;
  icon: string;
  startHour: number;
  endHour: number;
  averageScore: number | null;
  count: number;
}

export interface YearlyRecap {
  year: number;
  totalEntries: number;
  daysLogged: number;
  averageMoodScore: number;
  averageMoodLabel: string | null;
  mostUsedEmojiSymbol: string | null;
  mostUsedEmojiDescription: string | null;
  rarestEmojiSymbol: string | null;
  rarestEmojiDescription: string | null;
  bestMonth: string | null;
  bestMonthAvgScore: number;
  worstMonth: string | null;
  worstMonthAvgScore: number;
  longestStreak: number;
  moodPersonality: string | null;
}

// ─── Time capsules ──────────────────────────────────────────
export interface Capsule {
  capsuleId: number;
  sealedAt: string;
  unlockDate: string;
  daysLeft: number;
  ready: boolean;
  opened: boolean;
  openedAt: string | null;
  emojiId: number | null;
  emojiSymbol: string | null;
  emojiDescription: string | null;
  /** Only sent once the unlock date has arrived – sealed capsules never include it. */
  message: string | null;
}

export interface SealCapsuleRequest { message: string; emojiId?: number | null; unlockDate: string; }
