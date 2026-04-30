import React, {ReactNode} from 'react';
import Navbar from '@/widgets/Navbar';
import Sidebar from '@/widgets/Sidebar';
import { HomeAccessGuard } from '@/widgets/HomeAccessGuard';

type Props = {
    children: ReactNode;
}

const HomeLayout = ({children}: Props) => {
    return (
        <HomeAccessGuard>
            <div className="flex min-h-dvh w-full bg-dark-2">
                <Sidebar />

                <div className="relative flex min-h-dvh min-w-0 flex-1 flex-col">
                    <div
                        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_-15%,rgba(14,120,249,0.32),transparent_55%)]"
                        aria-hidden
                    />
                    <div
                        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-dark-2/45 to-dark-2"
                        aria-hidden
                    />

                    <Navbar />

                    <main className="relative z-[1] flex min-h-0 flex-1 flex-col overflow-x-hidden px-4 pb-8 pt-5 sm:px-6 md:px-10 lg:px-12 max-md:pb-14">
                        <div className="w-full flex-1">{children}</div>
                    </main>
                </div>
            </div>
        </HomeAccessGuard>
    )
}

export default HomeLayout;