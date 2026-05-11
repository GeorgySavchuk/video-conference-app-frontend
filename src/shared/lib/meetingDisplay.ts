/** Первая строка описания — заголовок встречи; пусто, если не задано. */
export function parseMeetingTitle(description: string): string {
    const parts = (description || '').split('\n\n');
    return (parts[0] || '').trim();
}

/** Только часы (интервал по расписанию), без даты — для кратких статусов «идёт встреча». */
export function formatMeetingClockRange(startTime: string, durationMin: number): string {
    try {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;

        const endMinutes = startMinutes + durationMin;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;

        return `${startTime}-${endTime}`;
    } catch {
        return startTime;
    }
}

export function formatMeetingTimeRange(dateStr: string, startTime: string, duration: number): string {
    try {
        return `${dateStr} ${formatMeetingClockRange(startTime, duration)}`;
    } catch {
        return `${dateStr} ${startTime}`;
    }
}

/** Границы слота в миллисекундах (локальное время браузера), как в форме создания встречи. */
export function parseMeetingSlotBoundsMs(m: {
    date: string;
    start_time: string;
    duration: number;
}): { start: number; end: number } | null {
    try {
        const dp = m.date.trim().split('.');
        if (dp.length !== 3) return null;
        const ds = parseInt(dp[0]!, 10);
        const mon = parseInt(dp[1]!, 10);
        const ys = parseInt(dp[2]!, 10);
        const tp = m.start_time.trim().split(':');
        const hh = parseInt(tp[0]!, 10);
        const mn = parseInt(tp[1]!, 10);
        if ([ds, mon, ys, hh, mn].some((n) => Number.isNaN(n))) return null;
        const startMs = new Date(ys, mon - 1, ds, hh, mn, 0, 0).getTime();
        if (Number.isNaN(startMs)) return null;
        const dur = Math.max(0, Number(m.duration) || 0);
        const endMs = startMs + dur * 60 * 1000;
        return { start: startMs, end: endMs };
    } catch {
        return null;
    }
}

/** Слот ещё не закончился — встреча может отображаться в «предстоящих» после refetch. */
export function isMeetingSlotNotEnded(m: {
    date: string;
    start_time: string;
    duration: number;
}): boolean {
    const b = parseMeetingSlotBoundsMs(m);
    return b !== null && b.end > Date.now();
}

/** Окно «Подключиться»: от начала до конца слота (локальное время браузера). */
export function canJoinMeetingSlot(m: {
    date: string;
    start_time: string;
    duration: number;
}): boolean {
    const b = parseMeetingSlotBoundsMs(m);
    if (!b) return false;
    const now = Date.now();
    return now >= b.start && now < b.end;
}

/** Слот встречи по полям date / start_time / duration (локальная дата-время), для UI без ожидания refetch. */
export function isMeetingSlotActiveNow(m: {
    date: string;
    start_time: string;
    duration: number;
}): boolean {
    const b = parseMeetingSlotBoundsMs(m);
    if (!b) return true;
    const now = Date.now();
    return now >= b.start && now < b.end;
}
