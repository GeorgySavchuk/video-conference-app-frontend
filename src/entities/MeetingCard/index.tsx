"use client";
import Image from "next/image";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/ui/button";
import { toast } from "sonner";

interface MeetingCardProps {
  title: string;
  date: string;
  icon: string;
  isPreviousMeeting?: boolean;
  buttonIcon1?: string;
  buttonText?: string;
  handleClick: () => void;
  link: string;
  isButtonDisabled?: boolean;
}

const MeetingCard = ({
  icon,
  title,
  date,
  handleClick,
  link,
  buttonText,
  isButtonDisabled,
}: MeetingCardProps) => {
  return (
    <section className="flex min-h-[258px] w-full flex-col justify-between rounded-[14px] bg-dark-1 px-5 py-8 xl:max-w-[568px] gap-5">
      <article className="flex flex-col gap-5">
        <Image src={icon} alt="upcoming" width={28} height={28} />
        <div className="flex justify-between">
          <div className="flex flex-col gap-2">
            <h1 
              className="text-2xl font-bold truncate-text-3-lines" 
              title={title.length > 90 ? title : undefined}
            >
              {title}
            </h1>
            <p className="text-base font-normal">{date}</p>
          </div>
        </div>
      </article>
      <article className={cn("relative", {})}>
        <div className="flex gap-2">
          <Button 
            onClick={handleClick} 
            className={cn(
              "rounded bg-blue-1 px-6 min-w-[30%]",
              {
                "cursor-pointer": !isButtonDisabled,
                "cursor-not-allowed opacity-50": isButtonDisabled
              }
            )}
            disabled={isButtonDisabled}
          >
            {buttonText}
          </Button>
          
          {!isButtonDisabled && (
            <Button
              onClick={() => {
                navigator.clipboard.writeText(link);
                toast.success("Ссылка скопирована");
              }}
              className="bg-dark-4 px-6 cursor-pointer hover:bg-dark-5"
            >
              <Image
                src="/icons/copy.svg"
                alt="feature"
                width={20}
                height={20}
              />
              Скопировать ссылку
            </Button>
          )}
        </div>
      </article>
    </section>
  );
};

export default MeetingCard;