"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PlusCircle, Handshake, TrendingDown, TrendingUp, PieChart } from 'lucide-react';
import { AddLendBorrowDialog } from '@/components/lend-borrow/AddLendBorrowDialog';
import { LendBorrowDataTable } from '@/components/lend-borrow/LendBorrowDataTable';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';

interface LendBorrowEntry {
  id: string;
  type: "lend" | "borrow";
  amount: number;
  description?: string;
  contact_name: string;
  transaction_date: string;
  due_date?: string;
  status: "pending" | "repaid" | "partial";
  repaid_amount: number;
}

export default function LendBorrowPage() {
  const { profile } = useProfile();
  const [lendEntries, setLendEntries] = useState<LendBorrowEntry[]>([]);
  const [borrowEntries, setBorrowEntries] = useState<LendBorrowEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'lend' | 'borrow'>('lend');

  useEffect(() => {
    if (profile) {
      fetchData();
    }
  }, [profile]);

  const fetchData = async () => {
    if (!profile) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lend_borrow')
        .select('*')
        .eq('user_id', profile.id)
        .order('transaction_date', { ascending: false });

      if (error) throw error;

      const lendData = data?.filter(entry => entry.type === 'lend') || [];
      const borrowData = data?.filter(entry => entry.type === 'borrow') || [];

      setLendEntries(lendData);
      setBorrowEntries(borrowData);
    } catch (error: any) {
      console.error('Error fetching lend/borrow data:', error);
      showError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    setIsAddDialogOpen(false);
    fetchData(); // Refresh data after adding
  };

  // Calculate totals
  const lendTotal = lendEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const lendPending = lendEntries.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const lendRepaid = lendEntries.filter(e => e.status === 'repaid').reduce((sum, e) => sum + e.amount, 0);

  const borrowTotal = borrowEntries.reduce((sum, entry) => sum + entry.amount, 0);
  const borrowPending = borrowEntries.filter(e => e.status === 'pending').reduce((sum, e) => sum + e.amount, 0);
  const borrowRepaid = borrowEntries.filter(e => e.status === 'repaid').reduce((sum, e) => sum + e.amount, 0);

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lend Summary */}
        <Card 
          className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => setActiveTab('lend')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
              <TrendingUp className="h-5 w-5" />
              Money Lent (Given Out)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Lent:</span>
              <span className="text-xl font-bold text-green-700 dark:text-green-300">NPR {lendTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending:</span>
              <span className="text-lg font-semibold text-orange-600">NPR {lendPending.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Repaid:</span>
              <span className="text-lg font-semibold text-green-600">NPR {lendRepaid.toLocaleString()}</span>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-green-600" />
              <div className="flex-1 bg-green-200 dark:bg-green-900/40 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all" 
                  style={{ width: lendTotal > 0 ? `${(lendRepaid / lendTotal) * 100}%` : '0%' }}
                ></div>
              </div>
              <span className="text-xs text-muted-foreground">
                {lendTotal > 0 ? Math.round((lendRepaid / lendTotal) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Borrow Summary */}
        <Card 
          className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => setActiveTab('borrow')}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <TrendingDown className="h-5 w-5" />
              Money Borrowed (Owed)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Borrowed:</span>
              <span className="text-xl font-bold text-red-700 dark:text-red-300">NPR {borrowTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Pending:</span>
              <span className="text-lg font-semibold text-orange-600">NPR {borrowPending.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Repaid:</span>
              <span className="text-lg font-semibold text-green-600">NPR {borrowRepaid.toLocaleString()}</span>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-red-600" />
              <div className="flex-1 bg-red-200 dark:bg-red-900/40 rounded-full h-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all" 
                  style={{ width: borrowTotal > 0 ? `${(borrowRepaid / borrowTotal) * 100}%` : '0%' }}
                ></div>
              </div>
              <span className="text-xs text-muted-foreground">
                {borrowTotal > 0 ? Math.round((borrowRepaid / borrowTotal) * 100) : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Lend and Borrow */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lend' | 'borrow')} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="lend" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Lent ({lendEntries.length})
          </TabsTrigger>
          <TabsTrigger value="borrow" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Borrowed ({borrowEntries.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lend" className="mt-6">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <LendBorrowDataTable data={lendEntries} onRefresh={fetchData} />
          )}
        </TabsContent>

        <TabsContent value="borrow" className="mt-6">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <LendBorrowDataTable data={borrowEntries} onRefresh={fetchData} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}