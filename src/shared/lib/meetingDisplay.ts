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

/** Слот встречи по полям date / start_time / duration (локальная дата-время), для UI без ожидания refetch. */
export function isMeetingSlotActiveNow(m: {
    date: string;
    start_time: string;
    duration: number;
}): boolean {
    try {
        const dp = m.date.split('.');
        if (dp.length !== 3) return true;
        const ds = parseInt(dp[0]!, 10);
        const mon = parseInt(dp[1]!, 10);
        const ys = parseInt(dp[2]!, 10);
        const tp = m.start_time.split(':');
        const hh = parseInt(tp[0]!, 10);
        const mn = parseInt(tp[1]!, 10);
        if ([ds, mon, ys, hh, mn].some((n) => Number.isNaN(n))) return true;
        const startMs = new Date(ys, mon - 1, ds, hh, mn, 0, 0).getTime();
        const endMs = startMs + m.duration * 60 * 1000;
        const now = Date.now();
        return now >= startMs && now < endMs;
    } catch {
        return true;
    }
}
