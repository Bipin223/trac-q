import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star, Repeat } from "lucide-react";
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
  subcategory?: { name: string } | null;
  is_favorite?: boolean;
  is_recurring?: boolean;
}

interface TransactionsDataTableProps {
  data: Transaction[];
  onToggleFavorite?: (id: string, currentStatus: boolean) => void;
}

export function TransactionsDataTable({ data, onToggleFavorite }: TransactionsDataTableProps) {
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
              <TableHead className="w-12"></TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow 
                key={item.id} 
                className={`transition-all duration-300 ${
                  item.is_favorite 
                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400' 
                    : ''
                }`}
              >
                <TableCell>
                  {onToggleFavorite && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 transition-all hover:scale-110 active:scale-95"
                      onClick={() => onToggleFavorite(item.id, item.is_favorite || false)}
                    >
                      <Star 
                        className={`h-4 w-4 transition-all duration-200 ${
                          item.is_favorite 
                            ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg animate-pulse' 
                            : 'text-muted-foreground hover:text-yellow-400 hover:scale-110'
                        }`} 
                      />
                    </Button>
                  )}
                </TableCell>
                <TableCell>{format(new Date(item.date), 'PPP')}</TableCell>
                <TableCell>{item.description || '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{item.category?.name || 'Uncategorized'}</span>
                    {item.subcategory && (
                      <span className="text-xs text-muted-foreground">
                        → {item.subcategory.name}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {item.is_recurring && (
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                      <Repeat className="h-3 w-3" />
                      Recurring
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(item.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}