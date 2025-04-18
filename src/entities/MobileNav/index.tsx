'use client'
import React from 'react';
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/shared/ui/sheet"
import Image from 'next/image';
import Link from 'next/link';
import {usePathname} from 'next/navigation';
import {sidebarLinks} from '@/shared/constants';
import {cn} from '@/shared/lib/utils';
import VisuallyHidden from '@/shared/ui/VisuallyHidden';

const MobileNav = () => {
    const pathname = usePathname();
    return (
        <section className='w-full max-w-[264px]'>
            <Sheet>
                <SheetTrigger asChild>
                    <Image
                        src="/icons/hamburger.svg"
                        alt="Биг тейсти"
                        width={36}
                        height={36}
                        className='cursor-pointer sm:hidden'
                    />
                </SheetTrigger>
                <SheetContent side='left' className='border-none bg-dark-1 p-6'>
                    <SheetHeader>
                        <VisuallyHidden>
                            <SheetTitle>Меню навигации</SheetTitle>
                            <SheetDescription>Навигация по приложению</SheetDescription>
                        </VisuallyHidden>
                    </SheetHeader>
                    <Link href='/' className='flex items-center gap-1'>
                        <Image
                            src='/icons/logo.svg'
                            alt='AmoConf logo'
                            width={32}
                            height={32}
                            className='max-sm:size-10'
                        />
                        <p className='text-[26px] font-extrabold text-white'>HellConf</p>
                    </Link>

                    <div className='flex h-[calc(100vh - 72px)] flex-col justify-between overflow-y-auto'>
                        <SheetClose asChild>
                            <section className='flex h-full flex-col gap-6 pt-16 text-white'>
                            {sidebarLinks.map(link => {
                                const active = pathname === link.route || pathname?.startsWith(`${link.route}/`);

                                return (
                                    <SheetClose asChild key={link.route}>
                                        <Link
                                            href={link.route}
                                            className={cn('flex gap-4 items-center p-4 rounded-lg w-full max-w-60', {
                                                'bg-blue-1': active,
                                            })}
                                        >
                                            <Image 
                                                src={link.imgUrl} 
                                                alt={link.label}
                                                width={20}
                                                height={20}
                                            />
                                            <p className='text-sm font-semibold'>
                                                {link.label}
                                            </p>
                                        </Link>
                                    </SheetClose>
                                )
                            })}
                            </section>
                        </SheetClose>
                    </div>
                </SheetContent>
            </Sheet>
        </section>
    );
};

export default MobileNav;