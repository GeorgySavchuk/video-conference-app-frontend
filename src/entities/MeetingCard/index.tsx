"use client";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";
import { Copy } from "lucide-react";

interface MeetingCardProps {
  title: string;
  subtitle?: string;
  date: string;
  icon: string;
  isPreviousMeeting?: boolean;
  buttonIcon1?: string;
  buttonText?: string;
  handleClick: () => void;
  link: string;
  isButtonDisabled?: boolean;
  /** Удаление / отмена встречи (только у владельца в списке) */
  onCancel?: () => void;
  cancelPending?: boolean;
}

const MeetingCard = ({
  icon,
  title,
  subtitle,
  date,
  handleClick,
  link,
  buttonText,
  isButtonDisabled,
  onCancel,
  cancelPending,
}: MeetingCardProps) => {
  const hasLink = Boolean(link?.trim());

  const copyLink = () => {
    if (!hasLink) {
      toast.error("Ссылка на встречу недоступна");
      return;
    }
    void navigator.clipboard.writeText(link.trim());
    toast.success("Ссылка скопирована");
  };

  return (
    <section
      className={cn(
        "flex w-full flex-col gap-6 rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1c2133] via-dark-1 to-[#151927]",
        "p-5 shadow-[0_8px_40px_rgba(0,0,0,0.35)] sm:flex-row sm:items-stretch sm:justify-between sm:gap-8 sm:p-6"
      )}
    >
      <article className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06]">
          <Image src={icon} alt="" width={22} height={22} className="opacity-90" />
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <h2
            className="text-xl font-semibold leading-snug tracking-tight text-white sm:text-2xl"
            title={title.length > 90 ? title : undefined}
          >
            <span className="line-clamp-3">{title}</span>
          </h2>
          {subtitle ? (
            <p className="line-clamp-2 text-sm text-zinc-300/90 sm:text-base" title={subtitle}>
              {subtitle}
            </p>
          ) : null}
          <p className="text-sm text-zinc-400 sm:text-base">{date}</p>
        </div>
      </article>

      <article className="flex shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[200px] sm:justify-center">
        <div className="flex flex-col gap-2 sm:items-end">
          <Button
            type="button"
            onClick={handleClick}
            disabled={isButtonDisabled}
            className={cn(
              "h-11 w-full rounded-xl px-5 text-sm font-semibold shadow-md sm:min-w-[180px]",
              "bg-blue-1 text-white hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#0E78F9]/50",
              isButtonDisabled && "pointer-events-none opacity-45"
            )}
          >
            {buttonText}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={copyLink}
            disabled={!hasLink}
            className={cn(
              "h-11 w-full rounded-xl border-white/15 bg-white/[0.04] px-4 text-sm font-medium text-white",
              "hover:bg-white/[0.08] disabled:opacity-40 sm:min-w-[180px]"
            )}
          >
            <Copy className="size-4 opacity-90" aria-hidden />
            Скопировать ссылку
          </Button>
          {onCancel ? (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={cancelPending}
              className={cn(
                "h-10 w-full rounded-xl border-rose-500/35 bg-rose-500/10 px-4 text-sm font-medium text-rose-200",
                "hover:bg-rose-500/20 disabled:opacity-50 sm:min-w-[180px]"
              )}
            >
              {cancelPending ? "Отмена…" : "Отменить встречу"}
            </Button>
          ) : null}
        </div>
      </article>
    </section>
  );
};

export default MeetingCard;
