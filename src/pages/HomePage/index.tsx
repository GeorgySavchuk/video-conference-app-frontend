'use client'
import React, {useEffect} from 'react';
import Timer from '@/entities/Timer';
import MeetingTypeList from '@/entities/MeetingTypeList';
import CurrentCall from '@/widgets/CurrentCall';
import {$upcomingMeetings, getUpcomingMeetings} from '@/shared/store/meetings';
import { useUnit } from 'effector-react';
import { $user } from '@/shared/store/auth';

const HomePage = () => {
    const [upcomingMeetings, fetchMeetings, user] = useUnit([$upcomingMeetings, getUpcomingMeetings, $user])
    
    useEffect(() => {
        fetchMeetings(String(user.ID))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const nextMeeting = upcomingMeetings?.[0];

    return (
        <section className='flex size-full flex-col gap-10 text-white'>
            <div
                className="h-[300px] w-full rounded-[20px]"
                style={{
                    backgroundImage: "url('/images/hero-background.png')",
                    backgroundSize: "cover",
                }}
            >
                <div className='flex h-full flex-col justify-between max-md:px-5 max-md:py-8 lg:p-11'>
                    <h2 className='glassmorphism max-w-[270px] rounded py-2 text-center text-base font-normal'>
                    {nextMeeting ? 
                        `Следующая встреча в ${nextMeeting.start_time}` : 
                        'На сегодня не запланировано встреч'
                    }
                    </h2>
                    <div className='flex flex-col gap-2'>
                        <h1 className='text-4xl font-semibold lg:text-7xl'>
                            <Timer/>
                        </h1>
                    </div>
                </div>
            </div>

            <MeetingTypeList />
            <CurrentCall/>
        </section>
    );
};

export default HomePage;