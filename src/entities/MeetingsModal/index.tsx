"use client";
import { ReactNode } from "react";
import Image from "next/image";

import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { Dialog } from "@/shared/ui/dialog";
import { HellconfDialogActions, HellconfDialogContent } from "@/shared/ui/hellconf-dialog";

interface MeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  className?: string;
  children?: ReactNode;
  handleClick?: () => void;
  buttonText?: string;
  instantMeeting?: boolean;
  image?: string;
  buttonClassName?: string;
  buttonIcon?: string;
  secondaryButtonText?: string;
  onSecondaryClick?: () => void;
}

const MeetingModal = ({
  isOpen,
  onClose,
  title,
  className,
  children,
  handleClick,
  buttonText,
  image,
  buttonIcon,
  buttonClassName,
  secondaryButtonText,
  onSecondaryClick,
}: MeetingModalProps) => {
  const hasActions = Boolean(buttonText || (secondaryButtonText && onSecondaryClick));

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <HellconfDialogContent maxWidthClass="max-w-[520px]">
        <div className="flex flex-col gap-6">
          {image && (
            <div className="flex justify-center">
              <Image src={image} alt="" width={72} height={72} />
            </div>
          )}
          <h2
            className={cn(
              "text-left text-2xl font-bold tracking-tight text-white sm:text-3xl",
              className,
            )}
          >
            {title}
          </h2>
          {children}
          {hasActions ? (
            <HellconfDialogActions>
              {secondaryButtonText && onSecondaryClick ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-12 w-full cursor-pointer rounded-2xl border-white/20 bg-transparent text-base font-semibold text-white hover:bg-white/10"
                  onClick={onSecondaryClick}
                >
                  {secondaryButtonText}
                </Button>
              ) : null}
              {buttonText ? (
                <Button
                  className={cn(
                    "h-12 w-full cursor-pointer rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-md hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#0E78F9]/50",
                    buttonClassName,
                  )}
                  onClick={handleClick}
                >
                  {buttonIcon ? (
                    <Image src={buttonIcon} alt="" width={16} height={16} className="opacity-95" />
                  ) : null}
                  {buttonIcon ? <span className="w-1 shrink-0" /> : null}
                  {buttonText}
                </Button>
              ) : null}
            </HellconfDialogActions>
          ) : null}
        </div>
      </HellconfDialogContent>
    </Dialog>
  );
};

export default MeetingModal;
