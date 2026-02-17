import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useScheduledTopUps, CreateSchedulePayload } from "@/hooks/useScheduledTopUps";
import { useAuth } from "@/contexts/AuthContext";
import { NETWORK_PROVIDERS, DATA_PLANS, type DataPlan, type NetworkProvider } from "@/lib/constants";
import { validateNigerianPhoneNumber, getNetworkFromPhone } from "@/lib/validation";
import { TimePicker12h } from "./TimePicker12h";
import { DataPlanPicker } from "./DataPlanPicker";

interface CreateScheduleSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function CreateScheduleSheet({ open, onOpenChange }: CreateScheduleSheetProps) {
  const { createSchedule } = useScheduledTopUps();
  const { profile } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const [type, setType] = useState<"airtime" | "data">("airtime");
  const [network, setNetwork] = useState("MTN");
  const [amount, setAmount] = useState("");
  const [selectedDataPlan, setSelectedDataPlan] = useState<DataPlan | null>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [scheduleType, setScheduleType] = useState<"one_time" | "daily" | "weekly" | "monthly">("one_time");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [recurringTime, setRecurringTime] = useState("09:00");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [maxExecutions, setMaxExecutions] = useState("10");

  // Reset data plan when network or type changes
  useEffect(() => {
    setSelectedDataPlan(null);
  }, [network, type]);

  // Prepopulate with user's registered phone number
  useEffect(() => {
    if (open && profile?.phone_number && !phoneNumber) {
      setPhoneNumber(profile.phone_number);
      const detected = getNetworkFromPhone(profile.phone_number);
      if (detected) setNetwork(detected);
    }
  }, [open, profile?.phone_number]);

  const validatePhone = (value: string) => {
    if (!value.trim()) {
      setPhoneError("Phone number is required");
      return false;
    }
    const result = validateNigerianPhoneNumber(value);
    if (!result.valid) {
      setPhoneError(result.error || "Please enter a valid phone number");
      return false;
    }
    setPhoneError("");
    return true;
  };

  const handlePhoneChange = (value: string) => {
    const sanitized = value.replace(/[^\d+\s]/g, "");
    setPhoneNumber(sanitized);

    if (sanitized.length >= 4) {
      const result = validateNigerianPhoneNumber(sanitized);
      if (result.valid && result.detectedNetwork) {
        setNetwork(result.detectedNetwork);
      }
      if (sanitized.replace(/\D/g, "").length >= 11) {
        validatePhone(sanitized);
      } else {
        setPhoneError("");
      }
    } else {
      setPhoneError("");
    }
  };

  const resetForm = () => {
    setType("airtime");
    setNetwork("MTN");
    setAmount("");
    setSelectedDataPlan(null);
    setPhoneNumber(profile?.phone_number || "");
    setPhoneError("");
    setScheduleType("one_time");
    setScheduledDate("");
    setScheduledTime("09:00");
    setRecurringTime("09:00");
    setDayOfWeek("1");
    setDayOfMonth("1");
    setMaxExecutions("10");
  };

  const isFormValid = () => {
    if (!phoneNumber || !!phoneError) return false;
    if (type === "airtime") {
      if (!amount || Number(amount) <= 0) return false;
    } else {
      if (!selectedDataPlan) return false;
    }
    if (scheduleType === "one_time" && !scheduledDate) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validatePhone(phoneNumber)) return;
    if (!isFormValid()) return;

    const { cleanedNumber } = validateNigerianPhoneNumber(phoneNumber);

    setSubmitting(true);

    const effectiveAmount = type === "data" && selectedDataPlan ? selectedDataPlan.finalPrice : Number(amount);

    const payload: CreateSchedulePayload = {
      type,
      network,
      amount: effectiveAmount,
      schedule_type: scheduleType,
      phone_number: cleanedNumber,
    };

    if (type === "data" && selectedDataPlan) {
      payload.plan_id = selectedDataPlan.id;
    }

    if (scheduleType === "one_time") {
      if (!scheduledDate) { setSubmitting(false); return; }
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
            <Input
              type="tel"
              placeholder="e.g. 08031234567"
              value={phoneNumber}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => phoneNumber && validatePhone(phoneNumber)}
              maxLength={15}
              className={phoneError ? "border-destructive" : ""}
            />
            {phoneError && (
              <p className="text-xs text-destructive">{phoneError}</p>
            )}
            {!phoneError && phoneNumber && validateNigerianPhoneNumber(phoneNumber).valid && (
              <p className="text-xs text-muted-foreground">
                Network: {getNetworkFromPhone(phoneNumber) || network}
              </p>
            )}
          </div>

          {/* Type */}
          <div className="space-y-2">
            <Label>Type</Label>
            <div className="flex gap-2">
              <Button variant={type === "airtime" ? "default" : "outline"} size="sm" onClick={() => setType("airtime")} className="flex-1">
                Airtime
              </Button>
              <Button variant={type === "data" ? "default" : "outline"} size="sm" onClick={() => setType("data")} className="flex-1">
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

          {/* Amount (airtime) or Data Plan (data) */}
          {type === "airtime" ? (
            <div className="space-y-2">
              <Label>Amount (₦)</Label>
              <Input type="number" placeholder="e.g. 1000" value={amount} onChange={(e) => setAmount(e.target.value)} min={50} />
            </div>
          ) : (
            <DataPlanPicker
              network={network}
              selectedPlanId={selectedDataPlan?.id || ""}
              onSelect={setSelectedDataPlan}
            />
          )}

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

          {/* One-time: Date & Time with AM/PM */}
          {scheduleType === "one_time" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} />
              </div>
              <TimePicker12h label="Time" value={scheduledTime} onChange={setScheduledTime} />
            </div>
          )}

          {/* Recurring: Time with AM/PM */}
          {scheduleType !== "one_time" && (
            <>
              <TimePicker12h label="Time of Day" value={recurringTime} onChange={setRecurringTime} />

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
                <Input type="number" value={maxExecutions} onChange={(e) => setMaxExecutions(e.target.value)} min={1} max={365} />
                <p className="text-xs text-muted-foreground">The schedule will stop after this many executions.</p>
              </div>
            </>
          )}

          <Button onClick={handleSubmit} disabled={submitting || !isFormValid()} className="w-full" size="lg">
            {submitting ? "Creating..." : "Create Schedule"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
