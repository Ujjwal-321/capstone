// ─── Auth Models ───────────────────────────────────────────
export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  token: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userId: number;
  fullName: string;
  email: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
}

// ─── User Models ────────────────────────────────────────────
export interface UserProfileResponse {
  userId: number;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  themePreference: 'LIGHT' | 'DARK';
  reminderAllowed: boolean;
  reminderTime: string | null;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
}

export interface UpdateProfileRequest {
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  themePreference?: 'LIGHT' | 'DARK';
  reminderAllowed?: boolean;
  reminderTime?: string;
}

// ─── Emoji Models ────────────────────────────────────────────
export interface EmojiResponse {
  emojiId: number;
  symbol: string;
  description: string;
  moodScore: number;
  isActive: boolean;
}

// ─── Mood Entry Models ──────────────────────────────────────
export interface MoodEntryCreateRequest {
  emojiId: number;
  entryText: string;
  entryDate: string; // LocalDate as ISO string
}

export interface MoodEntryResponse {
  entryId: number;
  emojiId: number;
  emojiSymbol: string;
  emojiDescription: string;
  moodScore: number;
  entryText: string;
  insightText?: string;
  entryDate: string;
  createdAt: string;
}

export interface MoodHistoryResponse {
  content: MoodEntryResponse[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ─── Stats Models ───────────────────────────────────────────
export interface MoodSummaryResponse {
  totalEntries: number;
  averageMoodScore: number | null;
  averageMoodLabel: string | null;
  mostUsedMood: string | null;
}

export interface MoodTrendPointResponse {
  date: string;
  moodScore: number;
  emojiSymbol: string;
  emojiDescription: string;
}

export interface StreakResponse {
  currentStreak: number;
  longestStreak: number;
}

export interface YearlyRecapResponse {
  year: number;
  totalEntries: number;
  averageMoodScore: number;
  averageMoodLabel: string;
  mostUsedEmojiSymbol: string;
  mostUsedEmojiDescription: string;
  rarestEmojiSymbol: string;
  rarestEmojiDescription: string;
  bestMonth: string;
  bestMonthAvgScore: number;
  worstMonth: string;
  worstMonthAvgScore: number;
  longestStreak: number;
  moodPersonality: string;
}

// ─── API Wrapper ─────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

// ─── Admin Models ────────────────────────────────────────────
export interface PageResponse<T> {
  content: T[];
  pageable: {
    pageNumber: number;
    pageSize: number;
  };
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ─── UI State Helpers ─────────────────────────────────────────
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export interface NavItem {
  label: string;
  icon: string;
  route: string;
  adminOnly?: boolean;
}
