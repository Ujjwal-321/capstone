import { HttpErrorResponse } from '@angular/common/http';

/**
 * Turns a failed request into one friendly sentence. The backend sends
 * {success:false, message, data} – for validation errors data is {field: message}.
 */
export function errorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return "Can't reach MoodCapsule right now. Check your connection and try again.";
    const body = err.error;
    if (body && typeof body === 'object') {
      if (body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
        const first = Object.values(body.data).find(v => typeof v === 'string');
        if (first) return String(first);
      }
      if (typeof body.message === 'string' && body.message.trim()) return body.message;
    }
    if (err.status >= 500) return 'The server had a problem. Please try again in a moment.';
  }
  return fallback;
}
