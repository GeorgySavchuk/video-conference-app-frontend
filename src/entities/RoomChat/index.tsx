'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import type { ChatMessage } from '@/features/mediasoup/MediasoupMeetingContext';
import { cn } from '@/shared/lib/utils';
import { CHAT_QUICK_EMOJIS } from '@/entities/RoomChat/chatEmojis';

type Props = {
  messages: ChatMessage[];
  onSend: (text: string) => Promise<void>;
  /** Без дублирующей шапки «Чат» — для модального окна с собственным header */
  embedded?: boolean;
};

const RoomChat = ({ messages, onSend, embedded = false }: Props) => {
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (!el) {
      setDraft((d) => d + emoji);
      setEmojiOpen(false);
      return;
    }
    const start = el.selectionStart ?? draft.length;
    const end = el.selectionEnd ?? draft.length;
    const next = draft.slice(0, start) + emoji + draft.slice(end);
    setDraft(next);
    setEmojiOpen(false);
    requestAnimationFrame(() => {
      el.focus();
      const pos = start + [...emoji].length;
      el.setSelectionRange(pos, pos);
    });
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      await onSend(text);
      setDraft('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-col',
        embedded
          ? 'bg-transparent'
          : 'max-w-full rounded-3xl border border-gray-700 bg-gray-800 md:max-w-[360px]'
      )}
    >
      {!embedded ? (
        <div className="shrink-0 border-b border-gray-700 px-3 py-2 text-sm font-medium text-white">
          Чат
        </div>
      ) : null}
      <div className="room-chat-messages-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            Пока нет сообщений — напишите первым.
          </p>
        ) : null}
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn(
              'max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm',
              m.isSelf
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto border border-white/10 bg-slate-800/90 text-slate-100'
            )}
          >
            <div className={cn('mb-0.5 text-xs font-medium', m.isSelf ? 'text-blue-100' : 'text-slate-400')}>
              {m.isSelf ? 'Вы' : m.displayName}
            </div>
            <div className="whitespace-pre-wrap break-words leading-relaxed">{m.text}</div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="shrink-0 border-t border-white/10 bg-slate-900/80 p-3 sm:p-4">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Написать сообщение…"
            className="min-h-11 min-w-0 flex-1 border-slate-600/80 bg-slate-800/80 text-white placeholder:text-slate-500 focus-visible:ring-blue-500/40"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
          />
          <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-11 w-11 shrink-0 border-slate-600/80 bg-slate-800/80 text-slate-200 hover:bg-slate-700/80 hover:text-white"
                aria-label="Добавить смайлик"
              >
                <Smile className="size-5" strokeWidth={1.75} />
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="end"
              side="top"
              sideOffset={8}
              /* Safari: ширина/высота через style — tailwind max-h с min() там часто игнорируется */
              style={{
                width: 'min(26rem, calc(100vw - 24px))',
                minWidth: 'min(280px, calc(100vw - 24px))',
                maxWidth: 'calc(100vw - 24px)',
                maxHeight: 'min(70dvh, 300px)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
              className="max-h-[85vh] rounded-2xl border border-solid border-slate-800/90 bg-[#1a1f2e] p-2 text-white shadow-2xl outline-none ring-0 ring-offset-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0 [color-scheme:dark]"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <p className="mb-2 shrink-0 px-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Смайлики
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, minmax(0, 1fr))',
                  gap: '4px',
                }}
                className={cn(
                  'room-chat-scroll-none min-h-0 w-full min-w-0 max-h-[11.5rem] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch] p-0.5 sm:max-h-[12.5rem] [color-scheme:dark]',
                )}
              >
                {CHAT_QUICK_EMOJIS.map((emoji, i) => (
                  <button
                    key={`emoji-${i}-${emoji}`}
                    type="button"
                    className="flex h-10 min-h-10 w-full min-w-0 cursor-pointer items-center justify-center rounded-lg text-xl leading-none transition hover:bg-white/15 hover:ring-1 hover:ring-white/10 active:scale-95"
                    onClick={() => insertEmoji(emoji)}
                    aria-label={`Вставить ${emoji}`}
                  >
                    <span className="pointer-events-none select-none">{emoji}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button
            type="button"
            size="sm"
            className="h-11 shrink-0 bg-blue-600 px-4 hover:bg-blue-500"
            disabled={sending || !draft.trim()}
            onClick={() => void submit()}
          >
            {sending ? '…' : 'Отпр.'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomChat;
