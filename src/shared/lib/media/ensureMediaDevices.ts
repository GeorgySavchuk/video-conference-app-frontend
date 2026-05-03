/**
 * В Chrome/Firefox `navigator.mediaDevices` есть только в «безопасном контексте»
 * (HTTPS, localhost и т.д.). Сайт только по IP без HTTPS даёт undefined → падение на getUserMedia.
 */
export const MEDIA_DEVICES_UNAVAILABLE_MESSAGE =
  'Камера и микрофон доступны только по HTTPS или на localhost. Подключите SSL (например, Let\'s Encrypt) к домену и откройте сайт по https://';

export function hasBrowserGetUserMedia(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  );
}

export function ensureMediaDevices(): void {
  if (!hasBrowserGetUserMedia()) {
    throw new Error(MEDIA_DEVICES_UNAVAILABLE_MESSAGE);
  }
}
