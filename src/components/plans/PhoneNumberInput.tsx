import { useState } from "react";
import { Phone, Lock, Plus, User } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PhoneNumber {
  id?: string;
  phone_number: string;
  network_provider?: string | null;
  label?: string | null;
  is_primary?: boolean;
}

interface PhoneNumberInputProps {
  phoneNumbers: PhoneNumber[];
  selectedPhoneId: string;
  onPhoneSelect: (phoneId: string) => void;
  manualPhoneNumber: string;
  onManualPhoneChange: (phone: string) => void;
  allowManualEntry?: boolean;
}

export function PhoneNumberInput({
  phoneNumbers,
  selectedPhoneId,
  onPhoneSelect,
  manualPhoneNumber,
  onManualPhoneChange,
  allowManualEntry = true,
}: PhoneNumberInputProps) {
  const [showManualInput, setShowManualInput] = useState(false);

  const handlePhoneSelect = (value: string) => {
    if (value === "manual") {
      setShowManualInput(true);
      onPhoneSelect("manual");
    } else {
      setShowManualInput(false);
      onPhoneSelect(value);
      onManualPhoneChange("");
    }
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground block">
        Select Phone Number
      </label>
      
      <Select value={selectedPhoneId} onValueChange={handlePhoneSelect}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select phone number" />
        </SelectTrigger>
        <SelectContent>
          {phoneNumbers.map((phone) => (
            <SelectItem key={phone.id || "primary"} value={phone.id || "primary"}>
              <div className="flex items-center gap-2">
                {phone.is_primary && <Lock className="w-3 h-3 text-primary" />}
                <Phone className="w-3 h-3 text-muted-foreground" />
                <span>{phone.phone_number}</span>
                {phone.network_provider && (
                  <Badge variant="secondary" className="text-xs ml-1">
                    {phone.network_provider}
                  </Badge>
                )}
                {phone.is_primary && (
                  <span className="text-xs text-primary">(Primary)</span>
                )}
              </div>
            </SelectItem>
          ))}
          {allowManualEntry && (
            <SelectItem value="manual">
              <div className="flex items-center gap-2">
                <Plus className="w-3 h-3 text-muted-foreground" />
                <span>Enter new number</span>
              </div>
            </SelectItem>
          )}
        </SelectContent>
      </Select>

      {showManualInput && allowManualEntry && (
        <div className="space-y-2">
          <Input
            type="tel"
            placeholder="Enter phone number (e.g., 08012345678)"
            value={manualPhoneNumber}
            onChange={(e) => onManualPhoneChange(e.target.value)}
            className="text-lg"
            maxLength={11}
          />
          <p className="text-xs text-muted-foreground">
            Enter an 11-digit Nigerian phone number
          </p>
        </div>
      )}

      {selectedPhoneId !== "manual" && phoneNumbers.find(p => (p.id || "primary") === selectedPhoneId) && (
        <p className="text-xs text-muted-foreground">
          {phoneNumbers.find(p => (p.id || "primary") === selectedPhoneId)?.is_primary
            ? "Primary account number - default for all purchases"
            : phoneNumbers.find(p => (p.id || "primary") === selectedPhoneId)?.label || "Additional number"}
        </p>
      )}
    </div>
  );
}
