import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScheduledTopUps, CreateSchedulePayload } from "@/hooks/useScheduledTopUps";
import { usePhoneNumbers } from "@/contexts/PhoneNumberContext";
import { NETWORK_PROVIDERS } from "@/lib/constants";

interface CreateScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CreateScheduleSheet({ open, onOpenChange }: CreateScheduleSheetProps) {
  const { createSchedule } = useScheduledTopUps();
  const { phoneNumbers } = usePhoneNumbers();
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<"airtime" | "data">("airtime");
  const [network, setNetwork] = useState("MTN");
  const [amount, setAmount] = useState("");
  const [scheduleType, setScheduleType] = useState<"one_time" | "daily" | "weekly" | "monthly">("one_time");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [recurringTime, setRecurringTime] = useState("09:00");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [maxExecutions, setMaxExecutions] = useState("10");
  const [phoneNumberId, setPhoneNumberId] = useState("");

  const resetForm = () => {
    setType("airtime");
    setNetwork("MTN");
    setAmount("");
    setScheduleType("one_time");
    setScheduledDate("");
    setScheduledTime("");
    setRecurringTime("09:00");
    setDayOfWeek("1");
    setDayOfMonth("1");
    setMaxExecutions("10");
    setPhoneNumberId("");
  };

  const handleSubmit = async () => {
    const amountNum = Number(amount);
    if (!amountNum || amountNum <= 0) return;
    if (!phoneNumberId) return;

    setSubmitting(true);

    const payload: CreateSchedulePayload = {
      type,
      network,
      amount: amountNum,
      schedule_type: scheduleType,
      phone_number_id: phoneNumberId,
    };

    if (scheduleType === "one_time") {
      if (!scheduledDate || !scheduledTime) {
        setSubmitting(false);
        return;
      }
      payload.scheduled_at = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    } else {
      payload.recurring_time = recurringTime;
      payload.max_executions = Number(maxExecutions) || 10;

      if (scheduleType === "weekly") {
        payload.recurring_day_of_week = Number(dayOfWeek);
      }
      if (scheduleType === "monthly") {
        payload.recurring_day_of_month = Number(dayOfMonth);
      }
    }

    const result = await createSchedule(payload);
    setSubmitting(false);

    if (!result.error) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Create Scheduled Top-Up</SheetTitle>
        </SheetHeader>

        <div className="space-y-5 mt-6">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Select value={phoneNumberId} onValueChange={setPhoneNumberId}>
              <SelectTrigger><SelectValue placeholder="Select phone number" /></SelectTrigger>
              <SelectContent>
                {phoneNumbers.map((pn) => (
                  <SelectItem key={pn.id} value={pn.id}>
                    {pn.label || pn.phone_number} ({pn.phone_number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button
                variant={type === "airtime" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("airtime")}
                className="flex-1"
              >
                Airtime
              </Button>
              <Button
                variant={type === "data" ? "default" : "outline"}
                size="sm"
                onClick={() => setType("data")}
                className="flex-1"
              >
                Data
              </Button>
            </div>
          </div>

          {/* Network */}
          <div className="space-y-2">
            <Label>Network</Label>
            <Select value={network} onValueChange={setNetwork}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NETWORK_PROVIDERS.map((n) => (
                  <SelectItem key={n} value={n}>{n}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Amount (₦)</Label>
            <Input
              type="number"
              placeholder="e.g. 1000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={50}
            />
          </div>

          {/* Schedule Type */}
          <div className="space-y-2">
            <Label>Schedule Type</Label>
            <Select value={scheduleType} onValueChange={(v) => setScheduleType(v as CreateSchedulePayload["schedule_type"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="one_time">One-time</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* One-time: Date & Time */}
          {scheduleType === "one_time" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input type="time" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} />
              </div>
            </div>
          )}

          {/* Recurring: Time */}
          {scheduleType !== "one_time" && (
            <>
              <div className="space-y-2">
                <Label>Time of Day</Label>
                <Input type="time" value={recurringTime} onChange={(e) => setRecurringTime(e.target.value)} />
              </div>

              {scheduleType === "weekly" && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DAY_NAMES.map((day, i) => (
                        <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {scheduleType === "monthly" && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>{i + 1}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Max Executions</Label>
                <Input
                  type="number"
                  value={maxExecutions}
                  onChange={(e) => setMaxExecutions(e.target.value)}
                  min={1}
                  max={365}
                />
                <p className="text-xs text-muted-foreground">The schedule will stop after this many executions.</p>
              </div>
            </>
          )}

          <Button
            onClick={handleSubmit}
            disabled={submitting || !amount || !phoneNumberId}
            className="w-full"
            size="lg"
          >
            {submitting ? "Creating..." : "Create Schedule"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
