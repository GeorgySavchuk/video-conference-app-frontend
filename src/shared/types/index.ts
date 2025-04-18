export type SidebarLinks = {
    label: string;
    route: string;
    imgUrl: string;
}[];

export type User = {
    username: string;
    ID: string;
}

export type AuthResponse = {
    user: {
        Name: string;
        ID: string;
    };
}

export type CreateMeetingParams = {
    creator_id: string;
    date: string;
    start_time: string;
    duration: number;
    description: string;
    link?: string;
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