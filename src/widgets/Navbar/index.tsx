'use client'
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import MobileNav from '@/entities/MobileNav';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import { useUnit } from 'effector-react';
import { $isAuthenticated, $user, logoutFx } from '@/shared/store/auth';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

const Navbar = () => {
    const [user, isAuthenticated, logout] = useUnit([$user, $isAuthenticated, logoutFx]);
    const router = useRouter();
    const handleClick = () => {
        logout();
        router.push('/sign-in');
    }

    return (
        <nav className='flex-between fixed z-50 w-full bg-dark-1 px-6 py-6 lg:px-10'>
            <Link href='/' className='flex items-center gap-1'>
                <Image
                    src='/icons/logo.svg'
                    alt='AmoConf logo'
                    width={32}
                    height={32}
                    className='max-sm:size-10'
                />
                <p className='text-[26px] font-extrabold text-white max-sm:hidden'>HellConf</p>
            </Link>

            <div className="flex-between gap-5">
                {
                    isAuthenticated && user && 
                        <div>
                            <DropdownMenu>
                                <DropdownMenuTrigger className="cursor-pointer">
                                    <Avatar>
                                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                                    </Avatar>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                    <DropdownMenuLabel>{user.username}</DropdownMenuLabel>
                                    <DropdownMenuSeparator/>
                                    <DropdownMenuItem onClick={handleClick} className="cursor-pointer">Выйти</DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                }
                <MobileNav/>
            </div>
        </nav>
    );
}

export default Navbar;