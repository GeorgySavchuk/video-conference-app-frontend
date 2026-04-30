export type SidebarLinks = {
    label: string;
    route: string;
    imgUrl: string;
}[];

export type User = {
    username: string;
    ID: string;
    /** С бэкенда после регистрации / validate; пусто у старых аккаунтов. */
    email?: string;
    /** С бэкенда: `preset:p0`…`preset:p7` или `avatars/<file>`. */
    avatar?: string;
    /** ISO 8601 (`created_at` в API) — дата регистрации. */
    createdAt?: string;
}

export type AuthResponse = {
    user: {
        name?: string;
        Name?: string;
        ID?: string;
        id?: string;
        email?: string;
        avatar?: string;
        created_at?: string;
        CreatedAt?: string;
    };
}

export type CreateMeetingParams = {
    creator_id: string;
    date: string;
    start_time: string;
    duration: number;
    description: string;
    link?: string;
    /** UUID комнаты — для поиска встречи по напоминаниям при opaque-ссылке /room/… */
    room_id?: string;
    /** Адреса для серверного письма-приглашения и подписки на напоминание */
    invite_emails?: string[];
  };

export type CreateMeetingResult = {
    meeting: Meeting;
    invite_emails_sent: number;
    invite_emails_failed: number;
};

export type CancelMeetingResult = {
    cancellation_emails_sent: number;
    cancellation_emails_failed: string[];
};
  
export interface Meeting {
    id: number;
    creator_id: string;
    date: string;
    start_time: string;
    duration: number;
    description: string;
    link: string;
    created_at: string;
    updated_at: string;
}