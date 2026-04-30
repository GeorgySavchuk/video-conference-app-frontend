'use client';

import React from 'react';
import { cn } from '@/shared/lib/utils';

type Props = {
  peerIds: string[];
  renderTile: (participantId: string) => React.ReactNode;
};

const gap = 'gap-2 sm:gap-3';
const pad = 'p-0.5 sm:p-1';

/** Нижняя плитка (3 участника): на мобилке — не шире половины сетки; на md+ не используется, ширину даёт 16:9 внутри ExtendedGridCell */
const halfTileMax =
  'w-full max-w-[calc((100%-0.5rem)/2)] sm:max-w-[calc((100%-0.75rem)/2)]';

const shell = 'h-full min-h-0 w-full min-w-0 flex-1';

/**
 * Мобилка: плитка заполняет ячейку.
 * Десктоп: 16:9 по высоте ячейки (`h-full` + `aspect-video` + `max-w-full`) — без container queries,
 * чтобы Safari не ломал размеры (cqh / container-type давали нулевую ширину и «узкую» третью плитку).
 */
function ExtendedGridCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 max-md:items-stretch md:items-center md:justify-center">
      <div
        className={cn(
          'flex min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-3xl',
          'max-md:h-full max-md:max-w-full max-md:aspect-auto',
          'md:aspect-video md:h-full md:max-h-full md:max-w-full md:w-auto md:shrink md:self-center',
        )}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Раскладка «Расширенный».
 * Три участника: мобилка — 2+1 (два сверху, третий снизу); десктоп — слева столбик из двух, справа третий на всю высоту (50/50 колонки), плитки 16:9 внутри ячеек.
 */
export function ExtendedModeGrid({ peerIds, renderTile }: Props) {
  const n = peerIds.length;
  if (n === 0) return null;

  if (n === 1) {
    return (
      <div className={cn('flex w-full flex-col', shell, pad)}>
        <div className="flex min-h-0 flex-1 flex-col">{renderTile(peerIds[0])}</div>
      </div>
    );
  }

  if (n === 2) {
    return (
      <div
        className={cn(
          'grid w-full items-stretch',
          shell,
          'grid-cols-2 grid-rows-1 max-md:grid-cols-1 max-md:grid-rows-2',
          gap,
          pad,
        )}
      >
        <ExtendedGridCell>{renderTile(peerIds[0])}</ExtendedGridCell>
        <ExtendedGridCell>{renderTile(peerIds[1])}</ExtendedGridCell>
      </div>
    );
  }

  if (n === 3) {
    const [a, b, c] = peerIds;
    /*
     * Мобилка: два сверху (grid), третий снизу — как раньше.
     * Десктоп: flex-row вместо grid + row-span — в Safari стабильнее; меньше gap между колонками.
     */
    return (
      <div
        className={cn(
          'mx-auto flex min-h-0 w-full max-w-[min(100%,calc(100vw-1rem),160rem)] flex-col gap-2 sm:gap-3',
          shell,
          'md:flex-row md:items-stretch md:gap-x-1.5 md:gap-y-0',
          pad,
        )}
      >
        <div
          className={cn(
            'grid min-h-0 min-w-0 flex-1 grid-cols-2 grid-rows-1 gap-2 sm:gap-3',
            'md:flex md:h-full md:min-h-0 md:flex-1 md:basis-0 md:flex-col md:gap-2 md:min-w-0',
          )}
        >
          <div className="min-h-0 min-w-0 md:flex md:min-h-0 md:flex-1 md:flex-col">
            <ExtendedGridCell>{renderTile(a)}</ExtendedGridCell>
          </div>
          <div className="min-h-0 min-w-0 md:flex md:min-h-0 md:flex-1 md:flex-col">
            <ExtendedGridCell>{renderTile(b)}</ExtendedGridCell>
          </div>
        </div>
        <div
          className={cn(
            'flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-center',
            'md:min-h-0 md:min-w-0 md:flex-1 md:basis-0 md:items-stretch md:justify-center',
          )}
        >
          <div
            className={cn(
              'flex h-full min-h-0 w-full flex-col max-md:justify-center',
              halfTileMax,
              'max-md:max-w-none',
              'md:max-w-full',
            )}
          >
            <ExtendedGridCell>{renderTile(c)}</ExtendedGridCell>
          </div>
        </div>
      </div>
    );
  }

  if (n === 4) {
    return (
      <div
        className={cn(
          'grid w-full min-h-0',
          shell,
          'grid-cols-2 grid-rows-[minmax(0,1fr)_minmax(0,1fr)]',
          gap,
          pad,
        )}
      >
        {peerIds.map((id) => (
          <ExtendedGridCell key={id}>{renderTile(id)}</ExtendedGridCell>
        ))}
      </div>
    );
  }

  if (n === 5) {
    const [a, b, c, d, e] = peerIds;
    return (
      <div
        className={cn(
          'grid w-full min-h-0',
          shell,
          'grid-cols-2 overflow-y-auto max-md:auto-rows-[minmax(10rem,20svh)] md:auto-rows-[minmax(11rem,22svh)]',
          gap,
          pad,
        )}
      >
        <ExtendedGridCell>{renderTile(a)}</ExtendedGridCell>
        <ExtendedGridCell>{renderTile(b)}</ExtendedGridCell>
        <ExtendedGridCell>{renderTile(c)}</ExtendedGridCell>
        <ExtendedGridCell>{renderTile(d)}</ExtendedGridCell>
        <div className="col-span-2 flex min-h-0 w-full items-center justify-center [container-type:size]">
          <div className={cn('flex h-full min-h-0 w-full flex-col', halfTileMax, 'max-md:max-w-none', 'md:max-w-full')}>
            <ExtendedGridCell>{renderTile(e)}</ExtendedGridCell>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'grid w-full min-h-0',
        shell,
        'auto-rows-[minmax(10.5rem,20svh)] grid-cols-2 md:grid-cols-3',
        gap,
        pad,
        'overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch]',
        'md:auto-rows-[minmax(12.5rem,24svh)]',
      )}
    >
      {peerIds.map((id) => (
        <ExtendedGridCell key={id}>{renderTile(id)}</ExtendedGridCell>
      ))}
    </div>
  );
}
