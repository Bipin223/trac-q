import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import React from "react";

interface SummaryCardProps {
  title: string;
  icon: React.ReactNode;
  period: string;
}

export const SummaryCard = ({ title, icon, period }: SummaryCardProps) => {
  return (
    <Card className="bg-white dark:bg-gray-800">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center space-x-2 text-gray-500">
          {icon}
          <CardTitle className="text-base font-medium">{title}</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-red-500">$0.00</p>
        <p className="text-2xl font-bold text-green-500">$0.00</p>
        <p className="text-xs text-gray-400 mt-2">{period}</p>
      </CardContent>
    </Card>
  );
};