import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { showSuccess, showError } from '@/utils/toast';
import { 
  ArrowRight, 
  ArrowLeft,
  Check, 
  X, 
  Clock,
  Send,
  Inbox,
  CheckCircle2,
  CalendarDays
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

interface PendingTransaction {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  description: string;
  transaction_type: string;
  status: string;
  sender_accepted: boolean;
  receiver_accepted: boolean;
  initiated_by: string;
  transaction_date: string;
  sender_profile: { full_name: string; email: string };
  receiver_profile: { full_name: string; email: string };
  created_at: string;
}

interface Friend {
  friend_id: string;
  friend_profile: { full_name: string; email: string };
}

export default function PendingTransactions() {
  const { profile } = useProfile();
  const [pendingTransactions, setPendingTransactions] = useState<PendingTransaction[]>([]);
  const [sentTransactions, setSentTransactions] = useState<PendingTransaction[]>([]);
  const [receivedTransactions, setReceivedTransactions] = useState<PendingTransaction[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // New transaction form
  const [selectedFriend, setSelectedFriend] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState('payment');
  const [transactionDate, setTransactionDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    if (profile) {
      fetchPendingTransactions();
      fetchFriends();
    }
  }, [profile]);

  const fetchFriends = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('friends')
      .select('friend_id, friend_profile:profiles!friends_friend_id_fkey(full_name, email)')
      .eq('user_id', profile.id)
      .eq('status', 'accepted');

    if (!error && data) {
      setFriends(data);
    }
  };

  const fetchPendingTransactions = async () => {
    if (!profile) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('pending_transactions')
      .select(`
        *,
        sender_profile:profiles!pending_transactions_sender_id_fkey(full_name, email),
        receiver_profile:profiles!pending_transactions_receiver_id_fkey(full_name, email)
      `)
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .in('status', ['pending_receiver', 'pending_sender'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending transactions:', error);
      showError('Failed to load pending transactions');
    } else {
      setPendingTransactions(data || []);
      setSentTransactions((data || []).filter((t: PendingTransaction) => t.sender_id === profile.id));
      setReceivedTransactions((data || []).filter((t: PendingTransaction) => t.receiver_id === profile.id));
    }
    setLoading(false);
  };

  const createTransaction = async () => {
    if (!profile || !selectedFriend || !amount) {
      showError('Please fill all required fields');
      return;
    }

    const { error } = await supabase
      .from('pending_transactions')
      .insert({
        sender_id: profile.id,
        receiver_id: selectedFriend,
        amount: parseFloat(amount),
        description,
        transaction_type: transactionType,
        transaction_date: transactionDate,
        initiated_by: profile.id,
        status: 'pending_receiver',
        sender_accepted: true,
        receiver_accepted: false,
      });

    if (error) {
      showError('Failed to create transaction');
    } else {
      showSuccess('Transaction sent! Waiting for acceptance.');
      setShowCreateDialog(false);
      resetForm();
      fetchPendingTransactions();
    }
  };

  const resetForm = () => {
    setSelectedFriend('');
    setAmount('');
    setDescription('');
    setTransactionType('payment');
    setTransactionDate(format(new Date(), 'yyyy-MM-dd'));
  };

  const acceptTransaction = async (transactionId: string) => {
    if (!profile) return;

    const { data, error } = await supabase
      .rpc('accept_pending_transaction', {
        transaction_id: transactionId,
        user_id: profile.id,
      });

    if (error) {
      showError('Failed to accept transaction');
    } else {
      if (data.status === 'completed') {
        showSuccess('Transaction completed!');
      } else {
        showSuccess('Transaction accepted! Waiting for other party.');
      }
      fetchPendingTransactions();
    }
  };

  const rejectTransaction = async (transactionId: string) => {
    const { error } = await supabase
      .from('pending_transactions')
      .update({ 
        status: 'rejected',
        rejected_at: new Date().toISOString(),
      })
      .eq('id', transactionId);

    if (error) {
      showError('Failed to reject transaction');
    } else {
      showSuccess('Transaction rejected');
      fetchPendingTransactions();
    }
  };

  const cancelTransaction = async (transactionId: string) => {
    const { error } = await supabase
      .from('pending_transactions')
      .update({ status: 'cancelled' })
      .eq('id', transactionId);

    if (error) {
      showError('Failed to cancel transaction');
    } else {
      showSuccess('Transaction cancelled');
      fetchPendingTransactions();
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(amount);
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'lend': return 'bg-blue-500';
      case 'borrow': return 'bg-orange-500';
      case 'payment': return 'bg-green-500';
      case 'gift': return 'bg-pink-500';
      case 'split': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const TransactionCard = ({ transaction, isSender }: { transaction: PendingTransaction; isSender: boolean }) => {
    const otherParty = isSender ? transaction.receiver_profile : transaction.sender_profile;
    const myAcceptance = isSender ? transaction.sender_accepted : transaction.receiver_accepted;
    const theirAcceptance = isSender ? transaction.receiver_accepted : transaction.sender_accepted;

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {isSender ? (
                  <ArrowRight className="h-4 w-4 text-destructive" />
                ) : (
                  <ArrowLeft className="h-4 w-4 text-green-500" />
                )}
                <CardTitle className="text-lg">
                  {isSender ? 'To' : 'From'}: {otherParty.full_name}
                </CardTitle>
              </div>
              <CardDescription className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className={getTransactionTypeColor(transaction.transaction_type)}>
                    {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                  </Badge>
                  <span className="text-lg font-bold">{formatCurrency(transaction.amount)}</span>
                </div>
                {transaction.description && (
                  <p className="text-sm mt-2">{transaction.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <CalendarDays className="h-3 w-3" />
                  {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                </div>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              {myAcceptance ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-orange-500" />
              )}
              <span>{myAcceptance ? 'You accepted' : 'You pending'}</span>
            </div>
            <div className="flex items-center gap-2">
              {theirAcceptance ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-orange-500" />
              )}
              <span>{theirAcceptance ? 'They accepted' : 'They pending'}</span>
            </div>
          </div>

          {!myAcceptance && (
            <div className="flex gap-2">
              <Button 
                onClick={() => acceptTransaction(transaction.id)} 
                size="sm" 
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button 
                onClick={() => rejectTransaction(transaction.id)} 
                variant="destructive" 
                size="sm" 
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          )}

          {myAcceptance && isSender && (
            <Button 
              onClick={() => cancelTransaction(transaction.id)} 
              variant="outline" 
              size="sm" 
              className="w-full"
            >
              Cancel Transaction
            </Button>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pending Transactions</h1>
          <p className="text-muted-foreground">Transactions requiring acceptance from both parties</p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Send className="h-4 w-4 mr-2" />
              New Transaction
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Transaction</DialogTitle>
              <DialogDescription>
                Send a transaction request to a friend. Both parties must accept.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Friend</Label>
                <Select value={selectedFriend} onValueChange={setSelectedFriend}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a friend" />
                  </SelectTrigger>
                  <SelectContent>
                    {friends.map(friend => (
                      <SelectItem key={friend.friend_id} value={friend.friend_id}>
                        {friend.friend_profile.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Transaction Type</Label>
                <Select value={transactionType} onValueChange={setTransactionType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payment">Payment</SelectItem>
                    <SelectItem value="lend">Lend Money</SelectItem>
                    <SelectItem value="borrow">Borrow Money</SelectItem>
                    <SelectItem value="gift">Gift</SelectItem>
                    <SelectItem value="split">Split Bill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Amount (NPR)</Label>
                <Input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label>Date</Label>
                <Input 
                  type="date" 
                  value={transactionDate} 
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Description (Optional)</Label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this transaction for?"
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={createTransaction}>
                Send Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Received ({receivedTransactions.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <Send className="h-4 w-4" />
            Sent ({sentTransactions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-6">
          {receivedTransactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending transactions received</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receivedTransactions.map(transaction => (
                <TransactionCard 
                  key={transaction.id} 
                  transaction={transaction} 
                  isSender={false}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {sentTransactions.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Send className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending transactions sent</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sentTransactions.map(transaction => (
                <TransactionCard 
                  key={transaction.id} 
                  transaction={transaction} 
                  isSender={true}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
