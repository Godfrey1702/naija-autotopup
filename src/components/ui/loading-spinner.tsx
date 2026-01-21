import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-10 h-10",
};

export function LoadingSpinner({ 
  size = "md", 
  className,
  label = "Loading" 
}: LoadingSpinnerProps) {
  return (
    <div 
      role="status" 
      aria-live="polite"
      className={cn("flex items-center justify-center", className)}
    >
      <Loader2 
        className={cn("animate-spin text-primary", sizeClasses[size])} 
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ 
  message = "Loading...",
  className 
}: LoadingOverlayProps) {
  return (
    <div 
      role="status"
      aria-live="polite"
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-50",
        className
      )}
    >
      <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}

interface FullPageLoadingProps {
  message?: string;
}

export function FullPageLoading({ message = "Loading..." }: FullPageLoadingProps) {
  return (
    <div 
      role="status"
      aria-live="polite"
      className="min-h-screen bg-background flex flex-col items-center justify-center"
    >
      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" aria-hidden="true" />
      <p className="text-muted-foreground">{message}</p>
      <span className="sr-only">{message}</span>
    </div>
  );
}
