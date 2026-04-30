'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/shared/lib/utils';

type Props = {
  title: string;
  children: React.ReactNode;
};

export function AuthFormShell({ title, children }: Props) {
  return (
    <div className="w-full">
      <div
        className={cn(
          'isolate overflow-hidden rounded-2xl border border-white/[0.07]',
          'bg-[#12151f]/85 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl',
          'ring-1 ring-inset ring-white/[0.04]'
        )}
      >
        <div className="flex flex-col md:flex-row md:min-h-[min(440px,70vh)]">
          <div
            className={cn(
              'relative flex min-h-[140px] flex-col items-center justify-center border-b border-white/[0.06]',
              'bg-gradient-to-br from-[#0E78F9]/[0.12] via-[#12151f] to-[#12151f] px-8 py-10',
              'md:min-h-0 md:w-[220px] md:shrink-0 md:border-b-0 md:border-r md:border-white/[0.06]'
            )}
          >
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.45]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 42%, rgba(14,120,249,0.35) 0%, transparent 58%)',
              }}
              aria-hidden
            />
            <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-[#0E78F9]/35 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
              <Image src="/icons/logo.svg" alt="" width={40} height={40} />
            </div>
            <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
              HellConf
            </p>
          </div>

          <div className="flex min-w-0 flex-1 flex-col justify-center px-6 py-8 sm:px-10 sm:py-10">
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">{title}</h1>
            <div className="mt-8 min-w-0">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
