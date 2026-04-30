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
    const isOrange = bgColor === 'bg-orange-1';
    return (
        <div
            className={cn(
                'group flex min-h-[260px] w-full cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-white/[0.07] px-5 py-7 xl:max-w-[1000px]',
                'bg-[#12151f]/90 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.45)] backdrop-blur-xl ring-1 ring-white/[0.04]',
                'transition duration-200 hover:border-white/[0.12] hover:shadow-[0_20px_56px_-16px_rgba(0,0,0,0.5)]',
                isOrange
                    ? 'bg-gradient-to-br from-[rgba(255,116,46,0.18)] via-[#12151f]/95 to-dark-2 hover:shadow-[0_20px_56px_-16px_rgba(255,116,46,0.15)]'
                    : 'bg-gradient-to-br from-[rgba(14,120,249,0.15)] via-[#12151f]/95 to-dark-2 hover:shadow-[0_20px_56px_-16px_rgba(14,120,249,0.2)]'
            )}
            onClick={handleClick}
        >
            <div className="flex size-12 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] shadow-inner">
                <Image src={iconPath} alt="" width={27} height={27} />
            </div>

            <h2 className="text-2xl font-bold tracking-tight text-white">{title}</h2>
        </div>
    );
}

export default MeetingType;