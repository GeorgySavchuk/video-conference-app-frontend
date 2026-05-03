import { MEDIA_DEVICES_UNAVAILABLE_MESSAGE } from '@/shared/lib/media/ensureMediaDevices';

/** Понятное сообщение для UI при ошибке входа в конференцию (WebRTC / signaling). */
export function formatMeetingJoinError(err: unknown): string {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : '';
  const m = raw.trim();
  if (!m) {
    return 'Связь с комнатой не установлена. Обновите страницу и попробуйте снова.';
  }

  if (m.includes('Камера и микрофон доступны только по HTTPS') || m === MEDIA_DEVICES_UNAVAILABLE_MESSAGE) {
    return m;
  }

  const low = m.toLowerCase();

  if (
    low.includes('requested device not found') ||
    low.includes('the object can not be found here') ||
    low.includes('notfounderror') ||
    low.includes('could not start video source') ||
    low.includes('could not start audio source')
  ) {
    return 'Камера или микрофон не найдены. Проверьте, что устройства подключены и разрешены в настройках браузера. На ноутбуке без камеры попробуйте разрешить только микрофон или другой браузер.';
  }

  if (
    low.includes('notallowederror') ||
    low.includes('permission denied') ||
    low.includes('permission dismissed')
  ) {
    return 'Доступ к камере или микрофону запрещён. Разрешите использование устройств для этого сайта в настройках браузера (значок замка в адресной строке).';
  }

  if (low.includes('overconstrainederror') || low.includes('constraint')) {
    return 'Браузер не смог подобрать параметры камеры/микрофона. Попробуйте другое устройство в настройках или другой браузер.';
  }

  if (low.includes('aborterror') || low.includes('user aborted')) {
    return 'Запрос к камере или микрофону был отменён. Попробуйте снова и подтвердите доступ.';
  }

  if (
    low.includes('createwebrtctransport') ||
    low.includes('channel request handler') ||
    low.includes('router.') ||
    (low.includes('not found') && low.includes('method:'))
  ) {
    return 'Сессия на сервере устарела (часто после перезапуска сервера). Обновите страницу (F5) и зайдите в комнату снова.';
  }

  if (low.includes('websocket') || low.includes('web socket')) {
    return 'Нет соединения с сервером звонка. Проверьте интернет и что сайт открыт по HTTPS, затем обновите страницу.';
  }

  if (
    low.includes('failed to fetch') ||
    low.includes('networkerror') ||
    low.includes('load failed') ||
    low.includes('network request failed')
  ) {
    return 'Проблема с сетью: не удалось связаться с сервером. Проверьте интернет и VPN.';
  }

  if (
    low.includes('getusermedia') &&
    (low.includes('undefined') || low.includes('cannot read'))
  ) {
    return MEDIA_DEVICES_UNAVAILABLE_MESSAGE;
  }

  if (low.includes('invalid character') && low.includes('header')) {
    return 'Ошибка перенаправления в браузере. Попробуйте обновить страницу или открыть комнату в режиме инкогнито без расширений.';
  }

  if (low.includes('ice') || low.includes('dtls') || low.includes('connection failed')) {
    return 'Не удалось установить медиа-соединение. Проверьте файрвол (UDP), VPN и попробуйте другую сеть или браузер.';
  }

  // Короткая техническая строка — показываем как есть, если уже по-русски
  if (/[а-яё]/i.test(m) && m.length < 200) {
    return m;
  }

  return 'Попробуйте обновить страницу или зайти из актуального Chrome, Edge или Firefox.';
}
