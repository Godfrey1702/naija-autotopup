import { AlertCircle, RefreshCw, WifiOff, ServerCrash, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorType = "generic" | "network" | "server" | "auth" | "notFound";

interface ErrorStateProps {
  type?: ErrorType;
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

const errorConfig: Record<ErrorType, { icon: React.ReactNode; defaultTitle: string; defaultMessage: string }> = {
  generic: {
    icon: <AlertCircle className="w-12 h-12 text-destructive" aria-hidden="true" />,
    defaultTitle: "Something went wrong",
    defaultMessage: "We encountered an unexpected error. Please try again.",
  },
  network: {
    icon: <WifiOff className="w-12 h-12 text-muted-foreground" aria-hidden="true" />,
    defaultTitle: "Connection Error",
    defaultMessage: "Unable to connect. Please check your internet connection and try again.",
  },
  server: {
    icon: <ServerCrash className="w-12 h-12 text-destructive" aria-hidden="true" />,
    defaultTitle: "Server Error",
    defaultMessage: "Our servers are experiencing issues. Please try again later.",
  },
  auth: {
    icon: <ShieldAlert className="w-12 h-12 text-destructive" aria-hidden="true" />,
    defaultTitle: "Authentication Error",
    defaultMessage: "Your session has expired. Please log in again.",
  },
  notFound: {
    icon: <AlertCircle className="w-12 h-12 text-muted-foreground" aria-hidden="true" />,
    defaultTitle: "Not Found",
    defaultMessage: "The requested resource could not be found.",
  },
};

export function ErrorState({
  type = "generic",
  title,
  message,
  onRetry,
  retryLabel = "Try Again",
  className,
}: ErrorStateProps) {
  const config = errorConfig[type];

  return (
    <div 
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center",
        className
      )}
    >
      <div className="mb-4">{config.icon}</div>
      <h3 className="font-semibold text-foreground text-lg mb-2">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">
        {message || config.defaultMessage}
      </p>
      {onRetry && (
        <Button 
          onClick={onRetry} 
          variant="default"
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" aria-hidden="true" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

interface InlineErrorProps {
  message: string;
  className?: string;
}

export function InlineError({ message, className }: InlineErrorProps) {
  return (
    <div 
      role="alert" 
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg",
        className
      )}
    >
      <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}
