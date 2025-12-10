import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow",
        "hero-golden": "bg-sage-light text-navy-dark hover:bg-sage-light/90 shadow-lg hover:shadow-xl",
        "hero-outline": "border-2 border-white/30 text-white bg-white/10 backdrop-blur-sm hover:bg-white/20 hover:border-white/40",
        "outline-dark": "border-2 border-sage-dark text-sage-dark bg-transparent hover:bg-sage-dark/10",
      },
      size: {
        default: "h-10 px-6 py-2",
        xl: "h-14 px-8 py-3 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
