/**
 * Разрешённые пути после входа: только комната (защита от open redirect).
 */
export function safeRedirectPath(raw: string | null): string | null {
  if (raw == null || typeof raw !== 'string') return null;
  const t = raw.trim();
  if (t === '') return null;
  if (!t.startsWith('/') || t.startsWith('//')) return null;
  if (/[\r\n]/.test(t)) return null;
  if (!t.startsWith('/room/')) return null;
  return t;
}
