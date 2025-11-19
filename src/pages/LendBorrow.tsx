"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle, Handshake } from 'lucide-react';
import { AddLendBorrowDialog } from '@/components/lend-borrow/AddLendBorrowDialog';
import { LendBorrowDataTable } from '@/components/lend-borrow/LendBorrowDataTable';
import { Skeleton } from '@/components/ui/skeleton';

export default function LendBorrowPage() {
  const [lendBorrowEntries, setLendBorrowEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    // Simulate fetching data (currently empty as per request)
    const fetchData = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      setLendBorrowEntries([]); // Initialize with no data
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleSuccess = () => {
    // In a real app, you would re-fetch data from the database here
    console.log("Lend/Borrow entry added successfully. Refreshing data...");
    setIsAddDialogOpen(false);
    // For now, we'll just close the dialog. No new dummy entry is added.
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Handshake className="h-7 w-7" />
          Lend & Borrow
        </h1>
        <Button 
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          Add New Entry
        </Button>
      </div>

      <AddLendBorrowDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={handleSuccess}
      />

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <LendBorrowDataTable data={lendBorrowEntries} />
      )}
    </div>
  );
}