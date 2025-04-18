import React, { ReactNode } from 'react';

type Props = {
    children: ReactNode;
}

const AuthLayout = ({ children }: Props) => {
    return (
        <main className="min-h-screen flex items-center justify-center">
            <div className="w-full max-w-md p-6">
                {children}
            </div>
        </main>
    )
}

export default AuthLayout;