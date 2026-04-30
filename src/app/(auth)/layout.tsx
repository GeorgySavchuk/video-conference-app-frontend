import React, { ReactNode } from 'react';

type Props = {
  children: ReactNode;
};

const AuthLayout = ({ children }: Props) => {
  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-dark-2">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,120,249,0.2),transparent)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-dark-2/75 to-dark-2"
        aria-hidden
      />

      <main className="relative z-[1] flex min-h-dvh flex-col items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[min(100%,42rem)]">{children}</div>
      </main>
    </div>
  );
};

export default AuthLayout;
