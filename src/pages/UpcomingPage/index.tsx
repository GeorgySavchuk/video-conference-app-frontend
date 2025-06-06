import CallList from '@/widgets/CallList';
import React from 'react';

const UpcomingPage = () => {
    return (
        <section className='flex size-full flex-col gap-10 text-white'>
            <h1 className='text-3xl font-bold'>
                Предстоящие встречи
            </h1>

            <CallList />
        </section>
    );
};

export default UpcomingPage;