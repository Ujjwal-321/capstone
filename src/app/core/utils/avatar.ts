/**
 * Profile avatars are an emoji (🦊) stored in the profile's avatarUrl field – same as Android.
 * Older accounts may still have an image link there; those are shown as a round picture.
 */
export const AVATAR_DEFAULT = '🙂';

export const AVATAR_CHOICES = [
  '🦊', '🐼', '🐨', '🐯', '🦁', '🐸',
  '🐧', '🦉', '🐻', '🐰', '🐱', '🐶',
  '🦄', '🐙', '🐢', '🌻', '🌙', '🌈'
];

export function isImageAvatar(value: string | null | undefined): boolean {
  return !!value && /^https?:\/\//i.test(value);
}

export function avatarEmoji(value: string | null | undefined): string {
  const v = value?.trim();
  return v && v.length <= 16 && !isImageAvatar(v) ? v : AVATAR_DEFAULT;
}
