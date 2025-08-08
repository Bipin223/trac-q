import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const TrendsCard = () => {
  return (
    <Card className="lg:col-span-2 bg-white dark:bg-gray-800">
      <CardHeader>
        <CardTitle>Income and Expense Trends</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center justify-center h-48">
        <p className="text-gray-500">No data</p>
      </CardContent>
    </Card>
  );
};