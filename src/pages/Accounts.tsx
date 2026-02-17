import { useState, useEffect } from 'react';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Wallet,
  Plus,
  Minus,
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getUserAccount, getTransactionHistory, addFunds, withdrawFunds, type Account, type Transaction } from '@/lib/paymentService';
import { format } from 'date-fns';

export default function Accounts() {
  const { profile } = useProfile();
  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchAccountData();
    }
  }, [profile]);

  const fetchAccountData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      const accountData = await getUserAccount(profile.id);
      const transactionData = await getTransactionHistory(profile.id, 50);
      setAccount(accountData);
      setTransactions(transactionData);
    } catch (error) {
      console.error('Error fetching account data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddFunds = async () => {
    if (!profile || !amount || parseFloat(amount) <= 0) return;
    setProcessing(true);
    const success = await addFunds(profile.id, parseFloat(amount));
    if (success) {
      setShowAddFunds(false);
      setAmount('');
      fetchAccountData();
    }
    setProcessing(false);
  };

  const handleWithdraw = async () => {
    if (!profile || !amount || parseFloat(amount) <= 0) return;
    setProcessing(true);
    const success = await withdrawFunds(profile.id, parseFloat(amount));
    if (success) {
      setShowWithdraw(false);
      setAmount('');
      fetchAccountData();
    }
    setProcessing(false);
  };

  const getTransactionIcon = (transaction: Transaction) => {
    if (transaction.transaction_type === 'credit') {
      return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-600" />;
  };

  const getTransactionColor = (transaction: Transaction) => {
    return transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Wallet className="h-7 w-7" />
            My Account
          </h1>
          <p className="text-muted-foreground">Manage your wallet and view transaction history</p>
        </div>
      </div>

      {/* Account Balance Card */}
      <Card className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
            <Wallet className="h-5 w-5" />
            Account Balance
          </CardTitle>
          <CardDescription>Your available funds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-4xl font-bold text-purple-700 dark:text-purple-300">
            रु  {account?.balance.toLocaleString() || '0'}
          </div>
          <div className="flex gap-3">
            <Button
              onClick={() => setShowAddFunds(true)}
              className="flex-1 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add Funds
            </Button>
            <Button
              onClick={() => setShowWithdraw(true)}
              variant="outline"
              className="flex-1 flex items-center gap-2"
            >
              <Minus className="h-4 w-4" />
              Withdraw
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <CardDescription>Your recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="p-2 rounded-full bg-muted">
                      {getTransactionIcon(transaction)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {transaction.description || 'Transaction'}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline" className="text-xs">
                          {transaction.category}
                        </Badge>
                        <span>{format(new Date(transaction.created_at), 'PPp')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-bold ${getTransactionColor(transaction)}`}>
                      {transaction.transaction_type === 'credit' ? '+' : '-'}
                      रु  {transaction.amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Balance: रु  {transaction.balance_after.toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Funds Dialog */}
      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds</DialogTitle>
            <DialogDescription>
              Add money to your account for testing purposes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-amount">Amount (रु )</Label>
              <Input
                id="add-amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddFunds(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddFunds} disabled={processing || !amount || parseFloat(amount) <= 0}>
              {processing ? 'Processing...' : 'Add Funds'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdraw} onOpenChange={setShowWithdraw}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw Funds</DialogTitle>
            <DialogDescription>
              Withdraw money from your account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="withdraw-amount">Amount (रु )</Label>
              <Input
                id="withdraw-amount"
                type="number"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={account?.balance || 0}
              />
              <p className="text-sm text-muted-foreground">
                Available balance: रु  {account?.balance.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdraw(false)}>
              Cancel
            </Button>
            <Button onClick={handleWithdraw} disabled={processing || !amount || parseFloat(amount) <= 0}>
              {processing ? 'Processing...' : 'Withdraw'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}