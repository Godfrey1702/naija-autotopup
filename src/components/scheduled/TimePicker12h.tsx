import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Clock } from "lucide-react";

interface TimePicker12hProps {
  label?: string;
  value: string; // 24h format "HH:mm"
  onChange: (value: string) => void;
}

function parse24h(time24: string): { hour12: string; minute: string; period: "AM" | "PM" } {
  const [h, m] = time24.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? "12" : h > 12 ? String(h - 12) : String(h);
  return { hour12, minute: String(m).padStart(2, "0"), period };
}

function to24h(hour12: string, minute: string, period: "AM" | "PM"): string {
  let h = Number(hour12);
  if (period === "AM" && h === 12) h = 0;
  else if (period === "PM" && h !== 12) h += 12;
  return `${String(h).padStart(2, "0")}:${minute}`;
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));

export function TimePicker12h({ label, value, onChange }: TimePicker12hProps) {
  const { hour12, minute, period } = parse24h(value);

  const update = (newHour?: string, newMinute?: string, newPeriod?: "AM" | "PM") => {
    onChange(to24h(newHour ?? hour12, newMinute ?? minute, newPeriod ?? period));
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center gap-2">
        <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
        <Select value={hour12} onValueChange={(v) => update(v)}>
          <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {HOURS.map((h) => (
              <SelectItem key={h} value={h}>{h}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-muted-foreground font-bold">:</span>
        <Select value={minute} onValueChange={(v) => update(undefined, v)}>
          <SelectTrigger className="w-[70px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {MINUTES.map((m) => (
              <SelectItem key={m} value={m}>{m}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={period} onValueChange={(v) => update(undefined, undefined, v as "AM" | "PM")}>
          <SelectTrigger className="w-[75px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
