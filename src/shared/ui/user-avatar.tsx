'use client';

import { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import { Avatar, AvatarFallback } from '@/shared/ui/avatar';
import {
  $avatarDisplayOverride,
  type AvatarDisplayOverride,
} from '@/shared/store/auth';
import { avatarPresetClass, userCustomAvatarUrl } from '@/shared/lib/avatarPresets';
import { cn } from '@/shared/lib/utils';

type UserAvatarDisplayProps = {
  avatar: string | undefined;
  displayName: string;
  className?: string;
  fallbackClassName?: string;
  /** Из `$avatarImageNonce` — ломает кэш URL после смены аватара. */
  imageNonce?: number;
};

function presetAvatarString(override: Extract<AvatarDisplayOverride, { kind: 'preset' }>) {
  return `preset:${override.presetId}`;
}

export function UserAvatarDisplay({
  avatar,
  displayName,
  className,
  fallbackClassName,
  imageNonce = 0,
}: UserAvatarDisplayProps) {
  const override = useUnit($avatarDisplayOverride);
  const t = displayName.trim();
  const initial = (t ? t : '?').slice(0, 1).toUpperCase();
  const imgUrl = userCustomAvatarUrl(avatar, imageNonce);

  const blobUrl = override?.kind === 'blob' ? override.url : null;
  const presetOverride = override?.kind === 'preset' ? override : null;

  const effectiveAvatarForPreset = presetOverride
    ? presetAvatarString(presetOverride)
    : avatar;
  const mountKey = presetOverride
    ? `ov-preset:${presetOverride.presetId}`
    : blobUrl
      ? `ov-blob:${blobUrl.slice(-24)}`
      : `${avatar ?? 'none'}:${imageNonce}`;

  const showServerImg = !blobUrl && !presetOverride && imgUrl;

  const [imgFailed, setImgFailed] = useState(false);
  useEffect(() => {
    setImgFailed(false);
  }, [mountKey]);

  return (
    <Avatar key={mountKey} className={className}>
      {blobUrl && !imgFailed ? (
        <img
          key={blobUrl}
          src={blobUrl}
          alt=""
          className="absolute inset-0 z-[2] size-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : showServerImg && !imgFailed ? (
        <img
          key={mountKey}
          src={imgUrl!}
          alt=""
          className="absolute inset-0 z-[2] size-full object-cover"
          onError={() => setImgFailed(true)}
        />
      ) : null}
      <AvatarFallback
        className={cn(
          'z-0 font-semibold text-white',
          avatarPresetClass(effectiveAvatarForPreset),
          fallbackClassName
        )}
      >
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
