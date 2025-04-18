import React, {ReactNode} from 'react';
import Navbar from '@/widgets/Navbar';
import Sidebar from '@/widgets/Sidebar';

type Props = {
    children: ReactNode;
}

const MeetingLayout = ({children}: Props) => {
    return (
        <main className='relative'>
            <div className='flex'>
                <div className='w-full h-[100vh]'>
                    {children}
                </div>
            </div>
        </main>
    )
}

export default MeetingLayout;