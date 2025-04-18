import React from 'react';
import MeetingPage from '@/pages/MeetingPage';

const Meeting = async ({
    params,
}: {
    params: Promise<{id: string}>,
}) => {
    const id = (await params).id;
    
    return (<MeetingPage meetingId={id} />);
};

export default Meeting;