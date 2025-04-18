import React from 'react';
import Image from 'next/image';
import {cn} from '@/shared/lib/utils';

type Props = {
    bgColor: string;
    title: string;
    iconPath: string;
    handleClick?: () => void;
}

const MeetingType = ({bgColor, title, iconPath, handleClick}: Props) => {
    return (
        <div className={cn('px-4 py-6 flex flex-col justify-between w-full xl:max-w-[1000px] min-h-[260px] rounded-[14px] cursor-pointer', bgColor)} onClick={handleClick}>
            <div className='flex-center glassmorphism size-12 rounded-[10px]'>
                <Image src={iconPath} alt='meeting' width={27} height={27} />
            </div>
        
            <h1 className='text-2xl font-bold'>{title}</h1>
        </div>
    );
}

export default MeetingType;