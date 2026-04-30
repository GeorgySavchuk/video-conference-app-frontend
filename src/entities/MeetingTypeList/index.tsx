'use client'
import React, { useEffect, useRef, useState } from 'react';
import MeetingType from '@/entities/MeetingType';
import MeetingModal from '../MeetingsModal';
import { ScheduleMeetingForm } from '@/entities/ScheduleMeetingForm';
import { toast } from 'sonner';
import { createMeetingRoomId } from '@/shared/lib/services';
import { useRouter } from 'next/navigation';
import { Input } from '@/shared/ui/input';
import { format } from 'date-fns';
import {
    combineCalendarAndTime,
    getDefaultScheduleSeed,
    normalizeTimeString,
} from '@/shared/lib/scheduleDefaults';
import { useUnit } from 'effector-react';
import { createMeetingFx } from '@/shared/store/meetings';
import { $user } from '@/shared/store/auth';
import { buildInstantRoomPath, buildRoomPath } from '@/shared/lib/meetingUrlParams';

const INSTANT_MEETING_DURATION_MINUTES = 60;

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
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [startTime, setStartTime] = useState<string>('12:00');
    const [duration, setDuration] = useState<string>('15');
    const [meetingTitle, setMeetingTitle] = useState('');
    const [showDescriptionField, setShowDescriptionField] = useState(false);
    const [inviteEmails, setInviteEmails] = useState<string[]>([]);
    const lastScheduleCreateRef = useRef(false);
    const [user] = useUnit([$user]);
    const [joinLink, setJoinLink] = useState<string>('')
    const scheduleJoinPathRef = useRef('');

    const seedScheduleDefaults = () => {
        const s = getDefaultScheduleSeed();
        setStartDate(s.startDate);
        setStartTime(s.startTime);
        setDuration(s.duration);
    };

    const resetScheduleForm = () => {
        setMeetingTitle('');
        setShowDescriptionField(false);
        setInviteEmails([]);
        setValues(initialValues);
        seedScheduleDefaults();
    };

    const openScheduleMeetingModal = () => {
        seedScheduleDefaults();
        setMeetingState('isScheduleMeeting');
    };

    const createMeetingRoom = async () => {
        let meetingId: string;
        try {
            meetingId = await createMeetingRoomId();
        } catch {
            toast.error('Не удалось создать комнату. Проверьте API и авторизацию.');
            return;
        }

        if (meetingState === 'isScheduleMeeting') {
            const startNorm = normalizeTimeString(startTime);
            if (!startDate || !startNorm) {
                toast.error('Укажите дату и время начала встречи');
                return;
            }
            const durationMin = Math.max(1, parseInt(duration, 10) || 15);
            const meetingDateTime = combineCalendarAndTime(startDate, startNorm)!;
            const newMeetingLink = buildRoomPath(
              meetingId,
              meetingDateTime.getTime(),
              durationMin
            );
            scheduleJoinPathRef.current = newMeetingLink;

            const descParts: string[] = [];
            if (meetingTitle.trim()) descParts.push(meetingTitle.trim());
            if (values.description.trim()) descParts.push(values.description.trim());
            const fullDescription = descParts.join('\n\n');

            const fullLink = `${window.location.origin}${newMeetingLink}`;
            const meetingParams = {
                creator_id: String(user.ID),
                room_id: meetingId,
                date: format(startDate, 'dd.MM.yyyy'),
                start_time: startNorm,
                duration: durationMin,
                description: fullDescription,
                link: fullLink,
                invite_emails: inviteEmails.length > 0 ? [...inviteEmails] : undefined,
            };
            if (
                !meetingParams.creator_id ||
                !meetingParams.date ||
                !meetingParams.start_time ||
                meetingParams.duration <= 0 ||
                !String(meetingParams.description || '').trim()
            ) {
                toast.error('Заполните все обязательные поля!');
                return;
            }
            setMeetingLink(fullLink);
            lastScheduleCreateRef.current = true;
            try {
                await createMeetingFx(meetingParams);
                setCallDetail(true);
            } catch {
                lastScheduleCreateRef.current = false;
                setMeetingLink('');
            }
            return;
        }

        setMeetingState(undefined);
        const relPath = buildInstantRoomPath(meetingId, INSTANT_MEETING_DURATION_MINUTES);
        router.push(relPath);
    };

    const handleJoinMeeting = () => {
        if (!joinLink.trim()) {
            toast.error('Введите ссылку на встречу');
            return;
        }

        const raw = joinLink.trim();
        try {
            const u =
                raw.startsWith('http://') || raw.startsWith('https://')
                    ? new URL(raw)
                    : new URL(raw.startsWith('/') ? raw : `/${raw}`, 'http://local.meeting');
            if (
              !u.pathname.startsWith('/room/') &&
              !u.pathname.startsWith('/meeting/')
            ) {
                toast.error('Некорректная ссылка на встречу');
                return;
            }
            setJoinLink('');
            router.push(`${u.pathname}${u.search}`);
        } catch {
            toast.error('Некорректная ссылка на встречу');
        }
    };
    

    useEffect(() => {
        const offFail = createMeetingFx.fail.watch(({ error }) => {
            if (!lastScheduleCreateRef.current) return;
            lastScheduleCreateRef.current = false;
            const msg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Ошибка создания встречи';
            toast.error(msg);
            setCallDetail(false);
            setMeetingLink('');
        });
        const offDone = createMeetingFx.done.watch(({ params, result }) => {
            lastScheduleCreateRef.current = false;
            const invited = params.invite_emails?.length ?? 0;
            if (invited === 0) return;
            const { invite_emails_sent: sent, invite_emails_failed: failed } = result;
            if (failed === 0 && sent > 0) {
                toast.success(
                    sent === 1
                        ? 'Приглашение отправлено на почту.'
                        : `Приглашения отправлены на почту (${sent} адресов).`,
                );
            } else if (sent > 0 && failed > 0) {
                toast.warning(
                    `Часть писем не доставлена: отправлено ${sent}, ошибок ${failed}. Скопируйте ссылку и перешлите остальным.`,
                );
            } else if (failed > 0) {
                toast.error(
                    'Не удалось отправить приглашения по почте. Скопируйте ссылку и отправьте участникам сами.',
                );
            } else if (invited > 0 && sent === 0 && failed === 0) {
                toast.info(
                    'Почта на сервере не настроена: подписки на напоминания сохранены. Скопируйте ссылку и перешлите при необходимости.',
                );
            }
        });
        return () => {
            offFail();
            offDone();
        };
    }, []);

    return (
        <section className='grid grid-cols-1 gap-6 md:grid-cols-1 xl:grid-cols-2'>
            <MeetingType bgColor='bg-orange-1' title='Создать встречу' iconPath='/icons/add-meeting.svg' handleClick={() => setMeetingState('isInstantMeeting')} />
            <MeetingType bgColor='bg-blue-1' title='Запланировать встречу' iconPath='/icons/schedule.svg' handleClick={openScheduleMeetingModal}/>
            {/* <MeetingType bgColor='bg-yellow-1'  title='Подключиться' iconPath='/icons/join-meeting.svg'  handleClick={() => setMeetingState('isJoiningMeeting')} /> */}
            {!callDetail ? (
                <MeetingModal
                    isOpen={meetingState === 'isScheduleMeeting'}
                    onClose={() => {
                        setMeetingState(undefined);
                        resetScheduleForm();
                    }}
                    title="Новая видеовстреча"
                    buttonText="Запланировать"
                    handleClick={() => {
                        void createMeetingRoom();
                    }}
                >
                    <ScheduleMeetingForm
                        meetingTitle={meetingTitle}
                        onMeetingTitleChange={setMeetingTitle}
                        description={values.description}
                        onDescriptionChange={(v) => setValues({ ...values, description: v })}
                        showDescription={showDescriptionField}
                        onShowDescriptionChange={setShowDescriptionField}
                        startDate={startDate}
                        onStartDateChange={setStartDate}
                        startTime={startTime}
                        onStartTimeChange={setStartTime}
                        duration={duration}
                        onDurationChange={setDuration}
                        inviteEmails={inviteEmails}
                        onInviteEmailsChange={setInviteEmails}
                    />
                </MeetingModal>
            ) : (
                <MeetingModal
                    isOpen={meetingState === 'isScheduleMeeting'}
                    onClose={() => {
                        setMeetingState(undefined)
                        setCallDetail(false)
                        setMeetingLink('')
                        resetScheduleForm()
                    }}
                    title="Встреча создана"
                    handleClick={() => {
                        if (!meetingLink.trim()) {
                            toast.error('Ссылка ещё не готова, попробуйте снова');
                            return;
                        }
                        navigator.clipboard.writeText(meetingLink);
                        toast.success('Ссылка скопирована');
                    }}
                    image={'/icons/checked.svg'}
                    buttonIcon="/icons/copy.svg"
                    className="text-center"
                    buttonText="Скопировать ссылку"
                    secondaryButtonText="Перейти к встрече"
                    onSecondaryClick={() => {
                        setMeetingState(undefined);
                        setCallDetail(false);
                        setMeetingLink('');
                        resetScheduleForm();
                        const p = scheduleJoinPathRef.current;
                        if (p) router.push(p);
                    }}
                >
                    <p className="text-left text-xs text-zinc-400">
                        Встреча сохранена и появится на главной. Указанным адресам мы отправим приглашение;
                        остальным просто перешлите ссылку кнопкой ниже.
                    </p>
                </MeetingModal>
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
                        placeholder="Ссылка на комнату (/room/…)"
                        value={joinLink}
                        onChange={(e) => setJoinLink(e.target.value)}
                        className="h-11 w-full rounded-xl border-white/20 bg-dark-1/90 text-white placeholder:text-zinc-400 focus-visible:border-[#0E78F9]/70 focus-visible:ring-[#0E78F9]/25"
                    />
                </div>
            </MeetingModal>
        </section>
    );
}

export default MeetingTypeList;