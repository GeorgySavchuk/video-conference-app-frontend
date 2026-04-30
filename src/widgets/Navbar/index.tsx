'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import MobileNav from '@/entities/MobileNav';
import { useUnit } from 'effector-react';
import { $avatarImageNonce, $isAuthenticated, $user, logoutFx } from '@/shared/store/auth';
import { UserAvatarDisplay } from '@/shared/ui/user-avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

export const Navbar = () => {
  const router = useRouter();
  const [isAuthenticated, user, logout, avatarNonce] = useUnit([
    $isAuthenticated,
    $user,
    logoutFx,
    $avatarImageNonce,
  ]);

  const handleClick = () => {
    logout();
    router.push('/sign-in');
  };

  if (!isAuthenticated) {
    return null;
  }

  const name = user.username?.trim() || 'Профиль';

  return (
    <nav className="sticky top-0 z-50 flex h-16 w-full shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#1C1F2E]/88 px-4 backdrop-blur-xl sm:h-[4.25rem] sm:px-6 lg:px-10">
      <Link href="/" className="flex cursor-pointer items-center gap-2">
        <Image
          src="/icons/logo.svg"
          alt="AmoConf logo"
          width={32}
          height={32}
          className="max-sm:size-10"
        />
        <p className="text-[22px] font-extrabold tracking-tight text-white max-sm:hidden sm:text-[26px]">
          HellConf
        </p>
      </Link>

      <div className="flex items-center justify-end gap-3 sm:gap-5">
        <div className="hidden sm:block">
          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer">
              <UserAvatarDisplay
                avatar={user.avatar}
                displayName={name}
                imageNonce={avatarNonce}
              />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={6}
              className="min-w-[14rem] rounded-xl border border-white/[0.08] bg-dark-1 p-1.5 text-slate-100 shadow-xl"
            >
              <DropdownMenuLabel className="px-3 py-2 text-sm font-semibold text-white">
                {name}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                className="cursor-pointer rounded-lg px-3 py-2 text-sm no-underline text-slate-300 focus:bg-white/[0.08] focus:text-white data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-white"
                onClick={() => router.push('/profile')}
              >
                Личный кабинет
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleClick}
                className="cursor-pointer rounded-lg px-3 py-2 text-sm no-underline text-slate-300 focus:bg-white/[0.08] focus:text-rose-300 data-[highlighted]:bg-white/[0.08] data-[highlighted]:text-rose-200"
              >
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <MobileNav />
      </div>
    </nav>
  );
};

export default Navbar;
