"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
};

interface LendBorrowEntry {
  id: string;
  type: "lend" | "borrow";
  amount: number;
  description?: string;
  contact_name: string;
  transaction_date: string;
  due_date?: string;
  status: "pending" | "repaid" | "partial";
  repaid_amount?: number;
}

interface LendBorrowDataTableProps {
  data: LendBorrowEntry[];
  onRefresh?: () => void;
}

export function LendBorrowDataTable({ data, onRefresh }: LendBorrowDataTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>No {data.length === 0 ? 'entries' : ''} yet.</p>
        <p className="text-sm">Click the "Add New Entry" button to get started.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Badge variant={entry.type === "lend" ? "default" : "secondary"}>
                    {entry.type.charAt(0).toUpperCase() + entry.type.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{entry.contact_name}</TableCell>
                <TableCell>{entry.description || '-'}</TableCell>
                <TableCell>{format(new Date(entry.transaction_date), 'PPP')}</TableCell>
                <TableCell>{entry.due_date ? format(new Date(entry.due_date), 'PPP') : '-'}</TableCell>
                <TableCell>
                  <Badge variant={entry.status === "repaid" ? "outline" : "destructive"}>
                    {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(entry.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}