/**
 * @fileoverview Admin Scheduled Top-Ups management page.
 */

import { useEffect, useState } from "react";
import { getScheduledTopUps } from "@/api/admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ScheduledTopUp {
  id: string;
  user_id: string;
  phone_number: string | null;
  network: string;
  type: string;
  amount: number;
  schedule_type: string;
  status: string;
  next_execution_at: string | null;
  total_executions: number;
  created_at: string;
}

export function ScheduledPage() {
  const [items, setItems] = useState<ScheduledTopUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchData = () => {
    setIsLoading(true);
    getScheduledTopUps({ page, limit, status: statusFilter !== "all" ? statusFilter : undefined })
      .then((data) => { setItems(data.schedules || []); setTotal(data.total || 0); })
      .catch(() => setItems([]))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchData(); }, [page]);

  const handleFilter = () => { setPage(1); fetchData(); };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Scheduled Top-Ups</h1>
        <p className="text-sm text-muted-foreground mt-1">{total} total schedules</p>
      </div>

      <div className="flex gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleFilter}>Filter</Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Phone</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Executions</TableHead>
              <TableHead>Next Run</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                  No scheduled top-ups found
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm">{s.phone_number || "—"}</TableCell>
                  <TableCell className="capitalize">{s.network}</TableCell>
                  <TableCell className="capitalize">{s.type}</TableCell>
                  <TableCell className="font-semibold">₦{s.amount.toLocaleString()}</TableCell>
                  <TableCell className="capitalize text-xs">{s.schedule_type}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "default" : "secondary"}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center">{s.total_executions}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.next_execution_at ? new Date(s.next_execution_at).toLocaleString() : "—"}
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
