import { api } from '@/shared/lib/api';

export const createMeetingRoomId = async (): Promise<string> => {
  const res = await api.post<{ roomId: string }>('/rooms');
  return res.data.roomId;
};
