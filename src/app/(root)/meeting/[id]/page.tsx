"use client"
import React, {useState, useEffect} from 'react';
import dynamic from 'next/dynamic';

const MeetingPage = dynamic(
  () => import('@/pages/MeetingPage'),
  { 
    ssr: false, 
  }
);

const Meeting = () => {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    if (!isClient) return null;

    return <MeetingPage />;
};

export default Meeting;