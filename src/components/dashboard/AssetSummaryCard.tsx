import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, CreditCard, PiggyBank } from "lucide-react";

export const AssetSummaryCard = () => {
  return (
    <Card className="lg:col-span-2 bg-card">
      <CardHeader>
        <CardTitle>Asset Summary</CardTitle>
        <p className="text-sm text-muted-foreground">You have recorded 0 accounts</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-muted dark:bg-muted/50 rounded-lg">
            <Landmark className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total assets</p>
            <p className="font-bold text-lg">$0.00</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-destructive/10 dark:bg-destructive/20 rounded-lg">
            <CreditCard className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total liabilities</p>
            <p className="font-bold text-lg">$0.00</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-primary/10 dark:bg-primary/20 rounded-lg">
            <PiggyBank className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Net assets</p>
            <p className="font-bold text-lg">$0.00</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};