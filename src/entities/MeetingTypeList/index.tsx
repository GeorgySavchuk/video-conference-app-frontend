'use client'
import React, { useEffect, useState } from 'react';
import MeetingType from '@/entities/MeetingType';
import MeetingModal from '../MeetingsModal';
import { Textarea } from '@/shared/ui/textarea';
import { toast } from 'sonner';
import { createMeeting } from '@/shared/lib/services';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Calendar } from '@/shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import { Button } from '@/shared/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useUnit } from 'effector-react';
import { $createMeetingError, createMeeting as _createMeeting} from '@/shared/store/meetings';
import { Input } from '@/shared/ui/input';
import { $user } from '@/shared/store/auth';

const initialValues = {
    dateTime: new Date(),
    description: '',
    link: '',
  };

const MeetingTypeList = () => {
    const router = useRouter();
    const [meetingState, setMeetingState] = useState<'isScheduleMeeting' | 'isJoiningMeeting' | 'isInstantMeeting' | undefined>(undefined);
    const [meetingLink, setMeetingLink] = useState<string>('');
    const [values, setValues] = useState(initialValues);
    const [callDetail, setCallDetail] = useState<boolean>();
    const [date, setDate] = useState<Date | undefined>();
    const [selectedTime, setSelectedTime] = useState<string>('12:00');
    const [duration, setDuration] = useState<string>('15')
    const [createMeetingError, _createNewMeeting, user] = useUnit([$createMeetingError, _createMeeting, $user])
    const [joinLink, setJoinLink] = useState<string>('')

    const timeSlots = Array.from({ length: 48 }, (_, i) => {
        const hours = Math.floor(i / 2);
        const minutes = (i % 2) * 30;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    });

    const createMeetingRoom = async () => {
        const meetingId = await createMeeting();
        const newMeetingLink = `/meeting/${meetingId}`;
        setMeetingLink(`${window.location.origin}${newMeetingLink}`);

        if (meetingState === 'isScheduleMeeting' && date) {
            const meetingParams = {
                creator_id: String(user.ID),
                date: format(date, 'dd.MM.yyyy'),
                start_time: selectedTime,
                duration: parseInt(duration),
                description: values.description,
                link: `${window.location.origin}${newMeetingLink}`,
            };

            _createNewMeeting(meetingParams);
        } else if (meetingState === 'isInstantMeeting') {
            router.push(newMeetingLink);
        }
    };

    const handleJoinMeeting = () => {
        if (!joinLink.trim()) {
            toast.error('Введите ссылку на встречу');
            return;
        }

        let meetingId = joinLink.trim();
        
        if (meetingId.includes('/meeting/')) {
            meetingId = meetingId.split('/meeting/')[1];
        }
        
        meetingId = meetingId.split('?')[0];
        
        if (!meetingId) {
            toast.error('Некорректная ссылка на встречу');
            return;
        }

        setJoinLink('')
        router.push(`/meeting/${meetingId}`);
    };
    

    useEffect(() => {
        let timeoutId: NodeJS.Timeout;
    
        if (meetingLink) {
            timeoutId = setTimeout(() => {
                if (createMeetingError) {
                    toast.error(createMeetingError);
                    setCallDetail(false);
                    setMeetingLink('');
                } else {
                    setCallDetail(true);
                }
            }, 500);
        }

        return () => clearTimeout(timeoutId);
    }, [createMeetingError, meetingLink, meetingState]);

    return (
        <section className='grid grid-cols-1 gap-5 md:grid-cols-1 xl:grid-cols-2'>
            <MeetingType bgColor='bg-orange-1' title='Создать встречу' iconPath='/icons/add-meeting.svg' handleClick={() => setMeetingState('isInstantMeeting')} />
            <MeetingType bgColor='bg-blue-1' title='Запланировать встречу' iconPath='/icons/schedule.svg' handleClick={() => setMeetingState('isScheduleMeeting')}/>
            {/* <MeetingType bgColor='bg-yellow-1'  title='Подключиться' iconPath='/icons/join-meeting.svg'  handleClick={() => setMeetingState('isJoiningMeeting')} /> */}
            {!callDetail ? (
                <MeetingModal
                    isOpen={meetingState === 'isScheduleMeeting'}
                    onClose={() => setMeetingState(undefined)}
                    title="Запланировать встречу"
                    buttonText="Создать"
                    handleClick={createMeetingRoom}
                >
                    <div className="flex flex-col gap-2.5">
                        <label className="text-base font-normal leading-[22.4px] text-sky-2">
                            Описание встречи
                        </label>
                        <Textarea
                            placeholder='Добавьте описание...'
                            className="border border-gray-300 bg-transparent focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-md"
                            onChange={(e) =>
                                setValues({ ...values, description: e.target.value })
                            }
                        />
                    </div>
                    <div className="flex w-full flex-col gap-2.5">
                        <label className="text-base font-normal leading-[22.4px] text-sky-2">
                            Дата встречи
                        </label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button 
                                    variant="outline"
                                    className="flex justify-between items-center w-full border border-gray-300 bg-transparent hover:bg-transparent hover:text-white"
                                >
                                    <span className={date ? 'text-white' : 'text-[oklch(0.554_0.046_257.417)]'}>
                                        {date ? format(date, "dd.MM.yyyy") : "Выберите дату"}
                                    </span>
                                    <CalendarIcon className="h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-0">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    locale={ru}
                                    initialFocus
                                    className="border border-gray-300 bg-transparent"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <div className="flex w-full flex-col gap-2.5">
                        <label className="text-base font-normal leading-[22.4px] text-sky-2">
                            Время начала встречи
                        </label>
                        <Select onValueChange={setSelectedTime}>
                            <SelectTrigger className="flex w-full border border-gray-300 bg-transparent">
                                <SelectValue placeholder="Выберите время" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[200px] overflow-y-auto">
                                <SelectGroup>
                                {timeSlots.map((time) => (
                                    <SelectItem 
                                        key={time} 
                                        value={time}
                                    >
                                        {time}
                                    </SelectItem>
                                ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex w-full flex-col gap-2.5">
                        <label className="text-base font-normal leading-[22.4px] text-sky-2">
                            Продолжительность встречи
                        </label>
                        <Select onValueChange={setDuration}>
                            <SelectTrigger className='flex w-full'>
                                <SelectValue placeholder="Выберите продолжительность" />
                            </SelectTrigger>
                            <SelectContent className='flex w-full'>
                                <SelectGroup>
                                    <SelectItem value="15">15 мин</SelectItem>
                                    <SelectItem value="30">30 мин</SelectItem>
                                    <SelectItem value="45">45 мин</SelectItem>
                                    <SelectItem value="60">60 мин</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>
                </MeetingModal>
            ) : (
                <MeetingModal
                    isOpen={meetingState === 'isScheduleMeeting'}
                    onClose={() => {
                        setMeetingState(undefined)
                        setCallDetail(false)
                    }}
                    title="Встреча создана"
                    handleClick={() => {
                        navigator.clipboard.writeText(meetingLink);
                        toast.success('Ссылка скопирована');
                    }}
                    image={'/icons/checked.svg'}
                    buttonIcon="/icons/copy.svg"
                    className="text-center"
                    // buttonText="Скопировать ссылку на встречу"
                />
            )}
            <MeetingModal
                isOpen={meetingState === 'isInstantMeeting'}
                onClose={() => setMeetingState(undefined)}
                title="Создать встречу"
                className="text-center"
                buttonText="Создать"
                handleClick={createMeetingRoom}
            />
            <MeetingModal
                isOpen={meetingState === 'isJoiningMeeting'}
                onClose={() => setMeetingState(undefined)}
                title="Подключиться к встрече"
                className="text-center"
                buttonText="Подключиться"
                handleClick={handleJoinMeeting}
            >
                <div className="flex flex-col gap-4">
                    <Input
                        placeholder="Введите ссылку на встречу"
                        value={joinLink}
                        onChange={(e) => setJoinLink(e.target.value)}
                        className="w-full"
                    />
                </div>
            </MeetingModal>
        </section>
    );
}

export default MeetingTypeList;