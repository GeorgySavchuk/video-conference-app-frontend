'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useUnit } from 'effector-react';
import { Camera, Plus, XIcon } from 'lucide-react';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  dialogCloseButtonClassName,
} from '@/shared/ui/dialog';
import { HellconfDialogContent } from '@/shared/ui/hellconf-dialog';
import {
  AVATAR_PRESETS,
  type AvatarPresetId,
  avatarPresetIdFromUser,
  userCustomAvatarUrl,
} from '@/shared/lib/avatarPresets';
import { setAvatarPresetFx, uploadAvatarFileFx } from '@/shared/store/auth';
import type { User } from '@/shared/types';
import { cn } from '@/shared/lib/utils';

const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 2 * 1024 * 1024;

type Selection = 'upload' | AvatarPresetId;

function isDirtySelection(
  user: User,
  selection: Selection,
  draftFile: File | null
): boolean {
  if (draftFile) return true;
  const serverPreset = avatarPresetIdFromUser(user.avatar);
  const hasCustom = Boolean(userCustomAvatarUrl(user.avatar));
  if (selection === 'upload') return false;
  if (hasCustom) return true;
  const effectiveServerPreset = serverPreset ?? 'p0';
  return selection !== effectiveServerPreset;
}

type Props = {
  user: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AvatarPickerDialog({ user, open, onOpenChange }: Props) {
  const [selection, setSelection] = useState<Selection>(AVATAR_PRESETS[0].id);
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pickPreset, uploadFile, presetPending, uploadPending] = useUnit([
    setAvatarPresetFx,
    uploadAvatarFileFx,
    setAvatarPresetFx.pending,
    uploadAvatarFileFx.pending,
  ]);
  const busy = presetPending || uploadPending;

  const revokePreview = useCallback((url: string | null) => {
    if (url) URL.revokeObjectURL(url);
  }, []);

  const resetFromUser = useCallback(() => {
    if (userCustomAvatarUrl(user.avatar)) {
      setSelection('upload');
    } else {
      setSelection((avatarPresetIdFromUser(user.avatar) ?? 'p0') as AvatarPresetId);
    }
    setDraftFile(null);
    setPreviewUrl((prev) => {
      revokePreview(prev);
      return null;
    });
    setError(null);
  }, [user.avatar, revokePreview]);

  useEffect(() => {
    if (open) resetFromUser();
  }, [open, resetFromUser]);

  useEffect(() => {
    return () => revokePreview(previewUrl);
  }, [previewUrl, revokePreview]);

  const dirty = isDirtySelection(user, selection, draftFile);

  const onPickFile = () => {
    setSelection('upload');
    setError(null);
    fileRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Нужен файл JPEG, PNG или WebP.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Файл больше 2 МБ.');
      return;
    }
    setDraftFile(file);
    setSelection('upload');
    setPreviewUrl((prev) => {
      revokePreview(prev);
      return URL.createObjectURL(file);
    });
  };

  const onSave = async () => {
    setError(null);
    try {
      if (draftFile) {
        await uploadFile(draftFile);
      } else if (selection !== 'upload') {
        await pickPreset(selection);
      }
      onOpenChange(false);
    } catch {
      setError('Не удалось сохранить. Попробуйте ещё раз.');
    }
  };

  /** Только превью выбранного файла — не показываем текущую кастомную аву, чтобы плитка явно означала «загрузить новое». */
  const uploadTilePreview = previewUrl;

  const tileBase =
    'relative aspect-[5/4] w-full cursor-pointer overflow-hidden rounded-2xl border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E78F9]/60 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <HellconfDialogContent
        framed={false}
        hideCloseButton
        maxWidthClass="sm:max-w-md"
        className="backdrop-blur-md"
        onOpenAutoFocus={(e: Event) => e.preventDefault()}
      >
        <DialogHeader className="flex flex-row items-center gap-3 border-b border-white/[0.08] bg-[#1c2133]/60 px-5 py-4 text-left">
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-white">
              Аватар профиля
            </DialogTitle>
            <DialogDescription className="sr-only">
              Выберите цветной пресет или загрузите фото, затем нажмите «Сохранить».
            </DialogDescription>
          </div>
          <DialogClose
            type="button"
            className={cn(dialogCloseButtonClassName, 'shrink-0')}
            aria-label="Закрыть"
          >
            <XIcon className="size-5" strokeWidth={2} aria-hidden />
          </DialogClose>
        </DialogHeader>

          <div className="px-5 py-4">
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={onFileChange}
          />

          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              disabled={busy}
              title="Выбрать новое фото с устройства"
              aria-label="Загрузить новое фото с устройства"
              onClick={onPickFile}
              className={cn(
                tileBase,
                'flex flex-col items-center justify-center gap-1 bg-dark-1/90',
                selection === 'upload'
                  ? 'border-[#0E78F9] shadow-lg ring-2 ring-[#0E78F9]/35'
                  : 'border-white/10 hover:border-[#0E78F9]/40'
              )}
            >
              {uploadTilePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={uploadTilePreview}
                  alt=""
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <>
                  <Camera className="size-7 text-slate-300" strokeWidth={1.75} />
                  <Plus className="-mt-1 size-4 text-slate-500" strokeWidth={2.5} />
                </>
              )}
            </button>

            {AVATAR_PRESETS.map((p) => {
              const selected = selection === p.id && !draftFile;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setDraftFile(null);
                    setPreviewUrl((prev) => {
                      revokePreview(prev);
                      return null;
                    });
                    setSelection(p.id);
                    setError(null);
                  }}
                  className={cn(
                    tileBase,
                    p.className,
                    selected
                      ? 'border-white shadow-lg ring-2 ring-[#0E78F9]/40'
                      : 'border-transparent hover:border-white/30'
                  )}
                  aria-label={`Пресет ${p.id}`}
                />
              );
            })}
          </div>

          {error ? (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          ) : null}
        </div>

        <div className="border-t border-white/[0.07] bg-[#141722]/80 p-4">
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={onSave}
            className={cn(
              'h-12 w-full cursor-pointer rounded-2xl text-base font-semibold transition',
              'bg-blue-1 text-white shadow-md hover:brightness-110',
              'disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100'
            )}
          >
            {busy ? 'Сохранение…' : 'Сохранить'}
          </button>
        </div>
      </HellconfDialogContent>
    </Dialog>
  );
}
