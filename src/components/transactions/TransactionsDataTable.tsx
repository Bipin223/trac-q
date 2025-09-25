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

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
};

interface Transaction {
  id: string;
  date: string;
  description: string | null;
  amount: number;
  category: { name: string } | null;
}

interface TransactionsDataTableProps {
  data: Transaction[];
}

export function TransactionsDataTable({ data }: TransactionsDataTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-12">
        <p>No transactions yet.</p>
        <p className="text-sm">Click the "Add" button to get started.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{format(new Date(item.date), 'PPP')}</TableCell>
                <TableCell>{item.description || '-'}</TableCell>
                <TableCell>{item.category?.name || 'Uncategorized'}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}