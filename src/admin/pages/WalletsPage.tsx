/**
 * @fileoverview Admin Wallets Overview page.
 * View user wallet balances and recent transactions.
 */

import { useEffect, useState } from "react";
import { getWallets } from "@/api/admin";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

interface WalletRow {
  id: string;
  user_id: string;
  full_name: string | null;
  balance: number;
  currency: string;
  updated_at: string;
}

export function WalletsPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchWallets = () => {
    setIsLoading(true);
    getWallets({ page, limit, search: search || undefined })
      .then((data) => {
        setWallets(data.wallets || []);
        setTotal(data.total || 0);
      })
      .catch(() => setWallets([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchWallets(); }, [page]);

  const handleSearch = () => { setPage(1); fetchWallets(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Wallet Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">All user wallets and balances</p>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by user name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={handleSearch}>Search</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : wallets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  No wallets found
                </TableCell>
              </TableRow>
            ) : (
              wallets.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-medium">{w.full_name || w.user_id.slice(0, 8)}</TableCell>
                  <TableCell className="font-semibold">₦{w.balance.toLocaleString()}</TableCell>
                  <TableCell className="text-muted-foreground">{w.currency}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {new Date(w.updated_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {total > limit && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {Math.ceil(total / limit)}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(page + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
