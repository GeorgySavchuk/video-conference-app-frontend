import {SidebarLinks} from "../types";

export const sidebarLinks: SidebarLinks = [
    {
        label: 'Главная',
        route: '/',
        imgUrl: '/icons/home.svg',
    },
    {
        label: 'Предстоящие встречи',
        route: '/upcoming',
        imgUrl: '/icons/upcoming.svg',
    },
    {
        label: 'Прошлые встречи',
        route: '/previous',
        imgUrl: '/icons/previous.svg',
    },
    {
        label: 'Записи встреч',
        route: '/recordings',
        imgUrl: '/icons/recordings.svg',
    },
    {
        label: 'Создать встречу',
        route: '/personal-room',
        imgUrl: '/icons/add-personal-room.svg',
    },
];