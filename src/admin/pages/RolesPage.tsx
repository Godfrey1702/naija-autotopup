/**
 * @fileoverview Admin Roles management page — grant/revoke admin role by email.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { findUserByEmail, grantAdmin, listAdmins, revokeAdmin } from "@/api/admin";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, ShieldCheck, ShieldOff, Search, UserPlus } from "lucide-react";

interface AdminRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
}

interface FoundUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  is_admin: boolean;
}

export function RolesPage() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundUser | null | undefined>(undefined);
  const [acting, setActing] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const data = await listAdmins();
      setAdmins(data.admins || []);
    } catch (err) {
      toast({ title: "Failed to load admins", description: (err as Error).message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setSearching(true);
    setFound(undefined);
    try {
      const data = await findUserByEmail(email.trim());
      setFound(data.user);
    } catch (err) {
      toast({ title: "Search failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleGrant = async (userId: string) => {
    setActing(userId);
    try {
      await grantAdmin(userId);
      toast({ title: "Admin role granted" });
      setFound((f) => (f ? { ...f, is_admin: true } : f));
      await refresh();
    } catch (err) {
      toast({ title: "Failed to grant", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  const handleRevoke = async (userId: string) => {
    if (!confirm("Revoke admin access from this user?")) return;
    setActing(userId);
    try {
      await revokeAdmin(userId);
      toast({ title: "Admin role revoked" });
      setFound((f) => (f && f.user_id === userId ? { ...f, is_admin: false } : f));
      await refresh();
    } catch (err) {
      toast({ title: "Failed to revoke", description: (err as Error).message, variant: "destructive" });
    } finally {
      setActing(null);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Role Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Grant or revoke admin access. Admins can manage users, wallets, and roles.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="w-4 h-4" /> Grant admin by email
        </h2>
        <form onSubmit={handleSearch} className="flex gap-2">
          <Input
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={searching}>
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span className="ml-2">Search</span>
          </Button>
        </form>

        {found === null && (
          <p className="text-sm text-muted-foreground">No user found with that email.</p>
        )}
        {found && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {found.full_name || "—"}
              </p>
              <p className="text-xs text-muted-foreground truncate">{found.email}</p>
            </div>
            {found.is_admin ? (
              <Button
                size="sm"
                variant="destructive"
                disabled={acting === found.user_id || found.user_id === user?.id}
                onClick={() => handleRevoke(found.user_id)}
              >
                <ShieldOff className="w-4 h-4 mr-2" />
                {found.user_id === user?.id ? "You" : "Revoke"}
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={acting === found.user_id}
                onClick={() => handleGrant(found.user_id)}
              >
                <ShieldCheck className="w-4 h-4 mr-2" />
                Grant admin
              </Button>
            )}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-foreground">Current admins</h2>
          <Badge variant="secondary">{admins.length}</Badge>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : admins.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">No admins yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {admins.map((a) => {
              const isSelf = a.user_id === user?.id;
              return (
                <li key={a.id} className="flex items-center justify-between py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate flex items-center gap-2">
                      {a.full_name || "—"}
                      {isSelf && <Badge variant="outline" className="text-xs">You</Badge>}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{a.email || a.user_id}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    disabled={isSelf || acting === a.user_id}
                    onClick={() => handleRevoke(a.user_id)}
                  >
                    {acting === a.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShieldOff className="w-4 h-4" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
