"use client";

import * as React from "react";
import { DialogContent } from "@/shared/ui/dialog";
import { cn } from "@/shared/lib/utils";

/** Оверлей для модалок HellConf */
export const HELLCONF_DIALOG_OVERLAY =
    "fixed inset-0 z-50 bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";

/** Без position:relative — иначе затирается fixed у DialogContent и модалка не центрируется */
const shellBase =
    "gap-0 overflow-hidden rounded-3xl border border-white/[0.09] bg-gradient-to-b from-[#1e2438] to-[#141722] p-0 text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06]";

export function HellconfDialogAccent() {
    return (
        <div
            className="pointer-events-none absolute inset-x-0 top-0 z-10 h-px bg-gradient-to-r from-transparent via-[#0E78F9]/35 to-transparent"
            aria-hidden
        />
    );
}

type HellconfDialogContentProps = React.ComponentProps<typeof DialogContent> & {
    /** Tailwind max-width, например max-w-[440px] */
    maxWidthClass?: string;
    /**
     * true — отступы + акцент сверху (форма, простые диалоги).
     * false — только оболочка; контент и отступы снаружи (сложные лэйауты).
     */
    framed?: boolean;
};

export function HellconfDialogContent({
    maxWidthClass = "max-w-[520px]",
    framed = true,
    className,
    children,
    hideCloseButton,
    ...props
}: HellconfDialogContentProps) {
    return (
        <DialogContent
            overlayClassName={HELLCONF_DIALOG_OVERLAY}
            className={cn(shellBase, "w-full", maxWidthClass, className)}
            hideCloseButton={hideCloseButton}
            {...props}
        >
            {framed ? (
                <div className="relative px-6 pb-6 pt-10">
                    <HellconfDialogAccent />
                    {children}
                </div>
            ) : (
                <div className="relative flex min-h-0 flex-col overflow-hidden">
                    <HellconfDialogAccent />
                    {children}
                </div>
            )}
        </DialogContent>
    );
}

/** Нижний блок с кнопками — разделитель как в диалоге отмены встречи */
export function HellconfDialogActions({ className, ...rest }: React.ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "mt-6 flex w-full flex-col gap-3 border-t border-white/[0.07] pt-6 sm:flex-col",
                className,
            )}
            {...rest}
        />
    );
}
