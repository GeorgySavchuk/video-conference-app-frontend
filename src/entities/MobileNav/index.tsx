'use client';

import React from 'react';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/ui/sheet';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { sidebarLinks } from '@/shared/constants';
import { cn } from '@/shared/lib/utils';
import { useUnit } from 'effector-react';
import { logoutFx } from '@/shared/store/auth';

const MobileNav = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [logout] = useUnit([logoutFx]);

  const handleLogout = () => {
    logout();
    router.push('/sign-in');
  };

  return (
    <div className="flex sm:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.05] text-white transition hover:bg-white/[0.09] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E78F9]/40"
            aria-label="Открыть меню"
          >
            <Image src="/icons/hamburger.svg" alt="" width={22} height={22} />
          </button>
        </SheetTrigger>
        <SheetContent
          side="left"
          className={cn(
            'w-[min(100%,320px)] border-none border-r border-white/[0.06] p-0 sm:max-w-sm',
            'bg-[#12151f]/95 backdrop-blur-xl'
          )}
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_-12%,rgba(14,120,249,0.22),transparent)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-[#161925]/85 to-[#12151f]"
            aria-hidden
          />
          <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/[0.04]" aria-hidden />

          <SheetHeader className="sr-only space-y-0 p-0">
            <SheetTitle>Меню навигации</SheetTitle>
            <SheetDescription>Разделы приложения HellConf</SheetDescription>
          </SheetHeader>

          <div className="relative z-0 flex h-full max-h-dvh flex-col overflow-hidden pt-14">
            <div className="px-5 pb-6">
              <SheetClose asChild>
                <Link href="/" className="flex items-center gap-2">
                  <Image src="/icons/logo.svg" alt="" width={32} height={32} />
                  <span className="text-[22px] font-extrabold tracking-tight text-white">HellConf</span>
                </Link>
              </SheetClose>
            </div>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
              {sidebarLinks.map((link) => {
                const active = pathname === link.route || pathname?.startsWith(`${link.route}/`);
                return (
                  <SheetClose asChild key={link.route}>
                    <Link
                      href={link.route}
                      className={cn(
                        'flex items-center gap-3 rounded-2xl px-3 py-3.5 transition-colors',
                        active
                          ? 'bg-[#0E78F9]/22 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-[#0E78F9]/35'
                          : 'text-zinc-400 hover:bg-white/[0.06] hover:text-white'
                      )}
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.06]">
                        <Image src={link.imgUrl} alt="" width={22} height={22} />
                      </span>
                      <span className="text-[15px] font-semibold leading-snug">{link.label}</span>
                    </Link>
                  </SheetClose>
                );
              })}
            </nav>

            <div className="border-t border-white/[0.08] px-4 pb-8 pt-4">
              <SheetClose asChild>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full rounded-2xl border border-rose-500/25 bg-rose-950/20 px-4 py-3.5 text-[15px] font-semibold text-rose-100/95 transition hover:bg-rose-950/35"
                >
                  Выйти
                </button>
              </SheetClose>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default MobileNav;
