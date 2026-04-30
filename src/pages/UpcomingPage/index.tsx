import CallList from '@/widgets/CallList';
import React from 'react';

const UpcomingPage = () => {
    return (
        <section className="relative flex size-full flex-col gap-10 text-white">
            <header className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Предстоящие встречи</h1>
                <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
                    Ссылку можно отправить участникам в любой момент — кнопка «Подключиться» станет активной, когда
                    наступит время начала.
                </p>
            </header>

            <CallList />
        </section>
    );
};

export default UpcomingPage;
