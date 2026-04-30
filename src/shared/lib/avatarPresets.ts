import { getApiBaseURL } from '@/shared/lib/api';

export type AvatarPresetId = (typeof AVATAR_PRESETS)[number]['id'];

export const AVATAR_PRESETS = [
  { id: 'p0', className: 'bg-gradient-to-br from-sky-500 to-indigo-700' },
  { id: 'p1', className: 'bg-gradient-to-br from-violet-500 to-fuchsia-700' },
  { id: 'p2', className: 'bg-gradient-to-br from-emerald-500 to-teal-700' },
  { id: 'p3', className: 'bg-gradient-to-br from-amber-500 to-orange-700' },
  { id: 'p4', className: 'bg-gradient-to-br from-rose-500 to-red-700' },
  { id: 'p5', className: 'bg-gradient-to-br from-slate-500 to-slate-700' },
  { id: 'p6', className: 'bg-gradient-to-br from-cyan-400 to-blue-600' },
  { id: 'p7', className: 'bg-gradient-to-br from-lime-500 to-green-700' },
] as const;

const presetMap = Object.fromEntries(AVATAR_PRESETS.map((p) => [p.id, p.className])) as Record<
  AvatarPresetId,
  string
>;

/** Значение `user.avatar` с бэкенда: preset:pN или путь avatars/… */
export function avatarPresetIdFromUser(avatar: string | undefined): string | null {
  if (!avatar || !avatar.startsWith('preset:')) return null;
  const id = avatar.slice('preset:'.length);
  return id in presetMap ? id : null;
}

/** `bust` — счётчик из стора, ломает кэш браузера после смены аватара. */
export function userCustomAvatarUrl(avatar: string | undefined, bust = 0): string | null {
  if (!avatar || avatar.startsWith('preset:')) return null;
  if (!avatar.startsWith('avatars/') || avatar.includes('..')) return null;
  const base = `${getApiBaseURL()}/uploads/${avatar}`;
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}v=${encodeURIComponent(avatar)}&t=${bust}`;
}

export function avatarPresetClass(avatar: string | undefined): string {
  const id = avatarPresetIdFromUser(avatar);
  if (!id) return 'bg-blue-1/30';
  return presetMap[id as AvatarPresetId];
}
