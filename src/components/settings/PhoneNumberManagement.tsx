import { useState } from "react";
import { motion } from "framer-motion";
import { Phone, Lock, Plus, Trash2, Edit2, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePhoneNumbers, DisplayPhoneNumber } from "@/contexts/PhoneNumberContext";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const nigerianPhoneSchema = z
  .string()
  .regex(/^(070|080|081|090|091)\d{8}$/, "Please enter a valid Nigerian phone number");

const networks = [
  { name: "MTN", prefix: ["0703", "0706", "0803", "0806", "0810", "0813", "0814", "0816", "0903", "0906", "0913", "0916"], color: "#FFCC00" },
  { name: "Airtel", prefix: ["0701", "0708", "0802", "0808", "0812", "0901", "0902", "0904", "0907", "0912"], color: "#FF0000" },
  { name: "Glo", prefix: ["0705", "0805", "0807", "0811", "0815", "0905", "0915"], color: "#00A551" },
  { name: "9mobile", prefix: ["0809", "0817", "0818", "0908", "0909"], color: "#006B53" },
];

const detectNetwork = (phone: string): string | null => {
  if (phone.length < 4) return null;
  const prefix = phone.slice(0, 4);
  for (const network of networks) {
    if (network.prefix.includes(prefix)) {
      return network.name;
    }
  }
  return null;
};

const getNetworkColor = (network: string | null): string => {
  if (!network) return "bg-muted";
  const found = networks.find((n) => n.name === network);
  return found ? `bg-[${found.color}]` : "bg-muted";
};

const maskPhoneNumber = (phone: string): string => {
  if (phone.length < 7) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-3)}`;
};

interface PhoneNumberManagementProps {
  onBack?: () => void;
}

export function PhoneNumberManagement({ onBack }: PhoneNumberManagementProps) {
  const { allPhoneNumbers, addPhoneNumber, updatePhoneNumber, deletePhoneNumber, canAddMore, loading } = usePhoneNumbers();
  const { toast } = useToast();
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  const [editingPhone, setEditingPhone] = useState<DisplayPhoneNumber | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 11);
    setNewPhone(cleaned);
    setDetectedNetwork(detectNetwork(cleaned));
    setPhoneError(null);
  };

  const handleAddPhone = async () => {
    const result = nigerianPhoneSchema.safeParse(newPhone);
    if (!result.success) {
      setPhoneError(result.error.errors[0].message);
      return;
    }

    setIsSubmitting(true);
    const { error } = await addPhoneNumber(newPhone, detectedNetwork, newLabel || undefined);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: error.message.includes("duplicate") 
          ? "This phone number is already added." 
          : "Failed to add phone number.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Phone added",
        description: "New phone number has been added successfully.",
      });
      setIsAddDialogOpen(false);
      setNewPhone("");
      setNewLabel("");
      setDetectedNetwork(null);
    }
  };

  const handleEditPhone = (phone: DisplayPhoneNumber) => {
    if (phone.is_primary) return;
    setEditingPhone(phone);
    setEditLabel(phone.label || "");
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingPhone?.id) return;
    
    setIsSubmitting(true);
    const { error } = await updatePhoneNumber(editingPhone.id, { label: editLabel || null });
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update phone number.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Updated",
        description: "Phone number label updated.",
      });
      setIsEditDialogOpen(false);
      setEditingPhone(null);
    }
  };

  const handleDeletePhone = async () => {
    if (!deleteConfirmId) return;
    
    setIsSubmitting(true);
    const { error } = await deletePhoneNumber(deleteConfirmId);
    setIsSubmitting(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete phone number.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Deleted",
        description: "Phone number and its auto top-up rules have been removed.",
      });
    }
    setDeleteConfirmId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Phone Numbers</h3>
          <p className="text-sm text-muted-foreground">
            Manage your phone numbers for top-ups
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" disabled={!canAddMore}>
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle>Add Phone Number</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="08012345678"
                    value={newPhone}
                    onChange={(e) => handlePhoneChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
                {phoneError && (
                  <p className="text-sm text-destructive">{phoneError}</p>
                )}
                {detectedNetwork && (
                  <p className="text-sm text-muted-foreground">
                    Network: <span className="font-medium text-foreground">{detectedNetwork}</span>
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Label (Optional)</label>
                <Input
                  placeholder="e.g., Work, Family, Kids"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>

              <Button onClick={handleAddPhone} className="w-full" disabled={isSubmitting || !newPhone}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add Phone Number
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Phone List */}
      <div className="space-y-3">
        {allPhoneNumbers.map((phone, index) => (
          <motion.div
            key={phone.id || "primary"}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card variant="gradient" className={`p-4 ${phone.is_primary ? "border-primary/30" : ""}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    phone.is_primary ? "gradient-primary" : "bg-secondary"
                  }`}>
                    {phone.is_primary ? (
                      <Lock className="w-5 h-5 text-primary-foreground" />
                    ) : (
                      <Phone className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">
                        {maskPhoneNumber(phone.phone_number)}
                      </p>
                      {phone.network_provider && (
                        <Badge variant="secondary" className="text-xs">
                          {phone.network_provider}
                        </Badge>
                      )}
                    </div>
                    {phone.is_primary ? (
                      <p className="text-xs text-primary">
                        Primary (Account Number)
                      </p>
                    ) : phone.label ? (
                      <p className="text-xs text-muted-foreground">{phone.label}</p>
                    ) : null}
                  </div>
                </div>

                {phone.is_primary ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Lock className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditPhone(phone)}
                      className="p-2 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(phone.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Primary phone helper text */}
      <p className="text-xs text-muted-foreground text-center">
        Your primary phone number is linked to your account and cannot be changed.
      </p>

      {/* Add more hint */}
      {!canAddMore && (
        <p className="text-xs text-muted-foreground text-center">
          Maximum of 4 phone numbers reached (1 primary + 3 additional).
        </p>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Phone Label</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Phone Number</label>
              <p className="text-sm text-muted-foreground">
                {editingPhone?.phone_number}
              </p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Label</label>
              <Input
                placeholder="e.g., Work, Family, Kids"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
              />
            </div>
            <Button onClick={handleSaveEdit} className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Phone Number?</AlertDialogTitle>
            <AlertDialogDescription>
              This will also remove any auto top-up rules associated with this phone number. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePhone}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
