import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, FilePenLine } from "lucide-react";

export const AugustExpenseCard = () => {
  return (
    <Card className="lg:col-span-2 relative overflow-hidden bg-white dark:bg-gray-800">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-bold">August Expense</CardTitle>
          <Button variant="ghost" size="icon">
            <RefreshCw className="h-5 w-5 text-gray-500" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-4xl font-bold text-orange-500">$0.00</p>
        <p className="text-gray-500 mt-2">Monthly income $0.00</p>
      </CardContent>
      <CardFooter>
        <Button className="bg-orange-400 text-white hover:bg-orange-500">View Details</Button>
      </CardFooter>
      <div className="absolute -bottom-6 -right-6 bg-orange-100 dark:bg-orange-900/50 rounded-full h-32 w-32 flex items-center justify-center">
        <FilePenLine className="h-12 w-12 text-orange-400 -translate-x-2 -translate-y-2" strokeWidth={1.5} />
      </div>
    </Card>
  );
};