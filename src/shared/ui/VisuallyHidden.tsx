import React from "react";
import {cn} from "../lib/utils";

const VisuallyHidden = ({
    className,
    children,
    ...props
  }: React.HTMLAttributes<HTMLSpanElement>) =>  {
    return (
      <span
        className={cn(
          "sr-only", 
          className
        )}
        {...props}
      >
        {children}
      </span>
    );
  }

export default VisuallyHidden;