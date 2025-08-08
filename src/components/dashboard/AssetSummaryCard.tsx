import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, CreditCard, PiggyBank } from "lucide-react";

export const AssetSummaryCard = () => {
  return (
    <Card className="lg:col-span-2 bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle>Asset Summary</CardTitle>
        <p className="text-sm text-gray-500">You have recorded 0 accounts</p>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
            <Landmark className="h-6 w-6 text-gray-600 dark:text-gray-300" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total assets</p>
            <p className="font-bold text-lg">$0.00</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-teal-100 dark:bg-teal-900/50 rounded-lg">
            <CreditCard className="h-6 w-6 text-teal-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total liabilities</p>
            <p className="font-bold text-lg">$0.00</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
            <PiggyBank className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Net assets</p>
            <p className="font-bold text-lg">$0.00</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};