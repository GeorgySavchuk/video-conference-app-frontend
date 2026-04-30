/**
 * Комната в URL: один сегмент пути `/room/<token>` — base64url(JSON),
 * где token содержит id комнаты и опционально время (s, d).
 * Legacy: `/room/<uuid>?p=…` и префикс `/meeting/…` → редирект в Next.
 */

/** @deprecated раньше использовался для обхода лобби; теперь см. {@link RoomOpaquePayload.instant} */
export const MEETING_DIRECT_JOIN_QUERY = 'dj';

export type MeetingQueryPayload = {
  startMs: number;
  durationMin: number;
};

/** Кодирует start (unix ms) и длительность (минуты) в один query-параметр `p` (legacy). */
export function encodeMeetingQueryParams(startMs: number, durationMin: number): string {
  const json = JSON.stringify({
    s: Math.floor(startMs),
    d: Math.max(1, Math.min(24 * 60, Math.floor(durationMin))),
  });
  const b64 = btoa(json);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeMeetingQueryParams(packed: string | null): MeetingQueryPayload | null {
  if (!packed?.trim()) return null;
  try {
    const p = packed.trim();
    const pad = p.length % 4 === 0 ? '' : '='.repeat(4 - (p.length % 4));
    const b64 = p.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const json = atob(b64);
    const o = JSON.parse(json) as { s?: unknown; d?: unknown };
    const startMs = typeof o.s === 'number' ? o.s : Number(o.s);
    const durationMin = typeof o.d === 'number' ? o.d : Number(o.d);
    if (!Number.isFinite(startMs) || !Number.isFinite(durationMin)) return null;
    return {
      startMs: Math.floor(startMs),
      durationMin: Math.max(1, Math.min(24 * 60, Math.floor(durationMin))),
    };
  } catch {
    return null;
  }
}

/** Полезная нагрузка в opaque-токене пути. */
export type RoomOpaquePayload = {
  /** UUID комнаты */
  i: string;
  /** Начало встречи (unix ms), опционально */
  s?: number;
  /** Длительность (мин), по умолчанию 60 */
  d?: number;
  /** Мгновенная комната (кнопка с главной); иначе запланированная по календарю */
  instant?: boolean;
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRoomUuidSegment(segment: string): boolean {
  return UUID_RE.test(segment.trim());
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecodeToBytes(token: string): Uint8Array | null {
  const p = token.trim();
  if (!p) return null;
  try {
    const pad = p.length % 4 === 0 ? '' : '='.repeat(4 - (p.length % 4));
    const b64 = p.replace(/-/g, '+').replace(/_/g, '/') + pad;
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export function encodeRoomOpaqueToken(payload: RoomOpaquePayload): string {
  const json = JSON.stringify(payload);
  return base64UrlEncode(new TextEncoder().encode(json));
}

export function decodeRoomOpaqueToken(segment: string): RoomOpaquePayload | null {
  const bytes = base64UrlDecodeToBytes(segment);
  if (!bytes?.length) return null;
  try {
    const json = new TextDecoder().decode(bytes);
    const o = JSON.parse(json) as Record<string, unknown>;
    const idRaw = o.i;
    if (typeof idRaw !== 'string' || !idRaw.trim()) return null;
    const id = idRaw.trim();
    if (!UUID_RE.test(id)) return null;

    const out: RoomOpaquePayload = { i: id };

    if (o.s !== undefined && o.s !== null) {
      const s = typeof o.s === 'number' ? o.s : Number(o.s);
      if (Number.isFinite(s)) out.s = Math.floor(s);
    }
    if (o.d !== undefined && o.d !== null) {
      const d = typeof o.d === 'number' ? o.d : Number(o.d);
      if (Number.isFinite(d)) {
        out.d = Math.max(1, Math.min(24 * 60, Math.floor(d)));
      }
    }
    if (o.instant === true) {
      out.instant = true;
    }
    return out;
  } catch {
    return null;
  }
}

/** Собирает путь комнаты: один сегмент без query. */
export function buildRoomPath(roomId: string, startMs: number, durationMin: number): string {
  const d = Math.max(1, Math.min(24 * 60, Math.floor(durationMin)));
  const payload: RoomOpaquePayload = {
    i: roomId.trim(),
    s: Math.floor(startMs),
    d,
  };
  const token = encodeRoomOpaqueToken(payload);
  return `/room/${token}`;
}

/** Мгновенная встреча: в токене `instant: true`, чтобы отличать от запланированной (у обеих есть `s` и `d`). */
export function buildInstantRoomPath(roomId: string, durationMin: number): string {
  const d = Math.max(1, Math.min(24 * 60, Math.floor(durationMin)));
  const payload: RoomOpaquePayload = {
    i: roomId.trim(),
    s: Math.floor(Date.now()),
    d,
    instant: true,
  };
  return `/room/${encodeRoomOpaqueToken(payload)}`;
}

/** @deprecated используйте {@link buildRoomPath} */
export const buildMeetingPath = buildRoomPath;

/** Разбор Next: сегмент пути + query (legacy uuid + ?p=). */
export function parseRoomRoute(
  pathSegment: string,
  searchParams: { get(name: string): string | null }
): {
  roomId: string;
  scheduledStartMs?: number;
  durationMin: number;
  /** Из opaque-токена; у legacy-ссылок без токена — false */
  isInstantMeeting: boolean;
} {
  const segment = pathSegment.trim();
  const opaque = decodeRoomOpaqueToken(segment);
  if (opaque) {
    return {
      roomId: opaque.i,
      scheduledStartMs: opaque.s,
      durationMin: opaque.d ?? 60,
      isInstantMeeting: opaque.instant === true,
    };
  }

  if (isRoomUuidSegment(segment)) {
    const packed = parseMeetingSearchParams(searchParams);
    return {
      roomId: segment,
      scheduledStartMs: packed.scheduledStartMs,
      durationMin: packed.durationMin,
      isInstantMeeting: false,
    };
  }

  return {
    roomId: '',
    durationMin: 60,
    isInstantMeeting: false,
  };
}

/** Разбор query: сначала `p`, иначе legacy `start` / `duration`. */
export function parseMeetingSearchParams(searchParams: {
  get(name: string): string | null;
}): { scheduledStartMs?: number; durationMin: number } {
  const packed = searchParams.get('p');
  const decoded = decodeMeetingQueryParams(packed);
  if (decoded) {
    return { scheduledStartMs: decoded.startMs, durationMin: decoded.durationMin };
  }

  const startParam = searchParams.get('start');
  const durationParam = searchParams.get('duration');
  let scheduledStartMs: number | undefined;
  if (startParam != null && startParam !== '') {
    const n = Number(startParam);
    if (Number.isFinite(n)) scheduledStartMs = n;
  }
  const durationMin =
    durationParam != null && durationParam !== '' && Number.isFinite(Number(durationParam))
      ? Math.max(1, Math.min(24 * 60, Math.floor(Number(durationParam))))
      : 60;

  return { scheduledStartMs, durationMin };
}
