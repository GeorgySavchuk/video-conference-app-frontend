'use client'
import dayjs from 'dayjs';
import React, {useEffect, useState} from 'react';

const Timer = () => {
    const [time, setTime] = useState(dayjs().format('HH:mm'));

    useEffect(() => {
        const updateTime = () => {
            setTime(dayjs().format('HH:mm'));
        };

        updateTime();

        const interval = setInterval(updateTime, 1000);

        return () => clearInterval(interval);
    }, []); 
    
    return (
        <div>
            {time}
        </div>
    );
};

export default Timer;