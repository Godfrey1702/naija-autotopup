import { motion } from "framer-motion";
import { CheckCircle, Share2, Download, Copy, X, Phone, Calendar, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface TransactionReceiptProps {
  type: "airtime" | "data";
  amount: number;
  phoneNumber: string;
  reference: string;
  date: Date;
  status: "completed" | "pending" | "failed";
  networkProvider?: string;
  planDetails?: string;
  onClose: () => void;
}

export function TransactionReceipt({
  type,
  amount,
  phoneNumber,
  reference,
  date,
  status,
  networkProvider,
  planDetails,
  onClose,
}: TransactionReceiptProps) {
  const { toast } = useToast();

  const formatDate = (d: Date) => {
    return d.toLocaleDateString("en-NG", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const receiptText = `
AutoTopUp Receipt
-----------------
Type: ${type === "airtime" ? "Airtime" : "Data"} Purchase
Amount: ₦${amount.toLocaleString()}
Phone: ${phoneNumber}
${networkProvider ? `Network: ${networkProvider}` : ""}
${planDetails ? `Plan: ${planDetails}` : ""}
Reference: ${reference}
Date: ${formatDate(date)}
Status: ${status.toUpperCase()}
-----------------
Thank you for using AutoTopUp!
  `.trim();

  const handleCopyReceipt = async () => {
    try {
      await navigator.clipboard.writeText(receiptText);
      toast({
        title: "Copied!",
        description: "Receipt copied to clipboard",
      });
    } catch {
      toast({
        title: "Error",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "AutoTopUp Receipt",
          text: receiptText,
        });
      } catch (err) {
        // User cancelled or share failed
        if ((err as Error).name !== "AbortError") {
          handleCopyReceipt();
        }
      }
    } else {
      handleCopyReceipt();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receipt-${reference}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: "Receipt saved to your device",
    });
  };

  return (
    <div className="min-h-screen gradient-hero flex flex-col">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-5 py-4 flex items-center justify-between"
      >
        <h1 className="text-lg font-semibold text-foreground">Transaction Receipt</h1>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center"
        >
          <X className="w-5 h-5 text-foreground" />
        </button>
      </motion.header>

      {/* Receipt Content */}
      <div className="flex-1 px-5 py-6 flex flex-col">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1"
        >
          {/* Success Icon */}
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className={`w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center ${
                status === "completed"
                  ? "bg-primary/20"
                  : status === "pending"
                  ? "bg-yellow-500/20"
                  : "bg-destructive/20"
              }`}
            >
              <CheckCircle
                className={`w-10 h-10 ${
                  status === "completed"
                    ? "text-primary"
                    : status === "pending"
                    ? "text-yellow-500"
                    : "text-destructive"
                }`}
              />
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {status === "completed" ? "Success!" : status === "pending" ? "Processing" : "Failed"}
            </h2>
            <p className="text-muted-foreground">
              {type === "airtime" ? "Airtime" : "Data"} purchase {status}
            </p>
          </div>

          {/* Amount */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center mb-6"
          >
            <p className="text-4xl font-bold text-foreground">₦{amount.toLocaleString()}</p>
            {planDetails && (
              <Badge variant="secondary" className="mt-2">
                {planDetails}
              </Badge>
            )}
          </motion.div>

          {/* Receipt Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card variant="gradient" className="p-5 space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                  <span className="text-sm">Phone Number</span>
                </div>
                <div className="text-right">
                  <p className="font-medium text-foreground">{phoneNumber}</p>
                  {networkProvider && (
                    <Badge variant="outline" className="text-xs mt-1">
                      {networkProvider}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Hash className="w-4 h-4" />
                  <span className="text-sm">Reference</span>
                </div>
                <p className="font-mono text-sm text-foreground">{reference}</p>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Date & Time</span>
                </div>
                <p className="text-sm text-foreground">{formatDate(date)}</p>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge
                  variant={status === "completed" ? "default" : status === "pending" ? "secondary" : "destructive"}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Badge>
              </div>
            </Card>
          </motion.div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3 pt-6"
        >
          <div className="grid grid-cols-3 gap-3">
            <Button variant="outline" onClick={handleShare} className="flex-col h-auto py-3">
              <Share2 className="w-5 h-5 mb-1" />
              <span className="text-xs">Share</span>
            </Button>
            <Button variant="outline" onClick={handleCopyReceipt} className="flex-col h-auto py-3">
              <Copy className="w-5 h-5 mb-1" />
              <span className="text-xs">Copy</span>
            </Button>
            <Button variant="outline" onClick={handleDownload} className="flex-col h-auto py-3">
              <Download className="w-5 h-5 mb-1" />
              <span className="text-xs">Download</span>
            </Button>
          </div>
          
          <Button onClick={onClose} className="w-full h-12">
            Done
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
