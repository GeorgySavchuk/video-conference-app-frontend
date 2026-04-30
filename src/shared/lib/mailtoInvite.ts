/** Открывает почтовый клиент с приглашениями (без бэкенд-рассылки). */
export function openMeetingInviteMailto(
  emails: string[],
  opts: { subject: string; body: string }
): void {
  const clean = emails.map((e) => e.trim()).filter(Boolean);
  if (clean.length === 0) return;
  const q = new URLSearchParams();
  q.set('subject', opts.subject);
  q.set('body', opts.body);
  const href = `mailto:${clean.map(encodeURIComponent).join(',')}?${q.toString()}`;
  window.location.assign(href);
}
