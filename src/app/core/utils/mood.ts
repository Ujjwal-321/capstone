/** Mood scores are 1 (toughest) … 5 (best); a day's score is the average of its moments. */

export function moodLevel(score: number | null | undefined): 0 | 1 | 2 | 3 | 4 | 5 {
  if (score === null || score === undefined || isNaN(score) || score <= 0) return 0;
  return Math.min(5, Math.max(1, Math.round(score))) as 1 | 2 | 3 | 4 | 5;
}

/** CSS colour for a score (the --mood-N tokens in styles.scss). */
export function moodColor(score: number | null | undefined): string {
  return `var(--mood-${moodLevel(score)})`;
}

const FACES = ['·', '😣', '😔', '😐', '🙂', '😊'];
const LABELS = ['No moments', 'Tough', 'Low', 'Okay', 'Good', 'Great'];

export function moodFace(score: number | null | undefined): string {
  return FACES[moodLevel(score)];
}

export function moodLabel(score: number | null | undefined): string {
  return LABELS[moodLevel(score)];
}

/** 4.25 → "4.3" (or "–" when there's nothing yet). */
export function score1(score: number | null | undefined): string {
  return score === null || score === undefined || isNaN(score) || score <= 0 ? '–' : score.toFixed(1);
}

export const MOOD_LEGEND = [1, 2, 3, 4, 5].map(level => ({ level, label: LABELS[level], face: FACES[level] }));
