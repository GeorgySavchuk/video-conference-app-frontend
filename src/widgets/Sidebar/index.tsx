'use client'
import React from 'react';
import {sidebarLinks} from '@/shared/constants';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {cn} from '@/shared/lib/utils';
import Image from 'next/image';

const Sidebar = () => {
    const pathname = usePathname();
    return (
        <aside
            className={cn(
                'sticky top-0 z-40 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-white/[0.06]',
                'bg-[#1C1F2E]/75 backdrop-blur-xl sm:flex xl:w-[280px]'
            )}
        >
            <div className="flex flex-1 flex-col gap-1 p-4 pt-6">
                {sidebarLinks.map((link) => {
                    const active = pathname === link.route || pathname?.startsWith(`${link.route}/`);

                    return (
                        <Link
                            href={link.route}
                            key={link.label}
                            className={cn(
                                'flex items-center gap-3 rounded-xl px-3 py-3 transition-colors',
                                active
                                    ? 'bg-[#0E78F9]/22 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-[#0E78F9]/35'
                                    : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                            )}
                        >
                            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/[0.04] ring-1 ring-white/[0.06]">
                                <Image src={link.imgUrl} alt="" width={22} height={22} />
                            </span>
                            <span className="text-[15px] font-semibold leading-snug max-lg:hidden">{link.label}</span>
                        </Link>
                    );
                })}
            </div>
        </aside>
    );
};

export default Sidebar;