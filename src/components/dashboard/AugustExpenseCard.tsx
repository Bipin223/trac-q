import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, FilePenLine } from "lucide-react";

export const AugustExpenseCard = () => {
  return (
    <Card className="lg:col-span-2 relative overflow-hidden bg-card">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">August Expense</CardTitle>
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold text-primary">$0.00</p>
        <p className="text-muted-foreground mt-2">Monthly income $0.00</p>
      </CardContent>
      <CardFooter>
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90">View Details</Button>
      </CardFooter>
      <div className="absolute -bottom-6 -right-6 bg-primary/10 dark:bg-primary/20 rounded-full h-32 w-32 flex items-center justify-center">
        <FilePenLine className="h-12 w-12 text-primary -translate-x-2 -translate-y-2" strokeWidth={1.5} />
      </div>
    </Card>
  );
};