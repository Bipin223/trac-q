import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { showSuccess, showError } from '@/utils/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  Receipt, 
  PlusCircle, 
  Users,
  Check,
  DollarSign
} from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, { message: 'Please enter a title' }),
  description: z.string().optional(),
  total_amount: z.coerce.number().positive({ message: 'Amount must be positive' }),
  selected_friends: z.array(z.string()).min(1, { message: 'Select at least one friend' }),
});

interface Friend {
  id: string;
  friend_id: string;
  friend_profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface SplitBill {
  id: string;
  creator_id: string;
  title: string;
  description: string;
  total_amount: number;
  currency: string;
  split_type: string;
  status: string;
  created_at: string;
  participants: Array<{
    id: string;
    user_id: string;
    share_amount: number;
    paid_amount: number;
    status: string;
    user: {
      first_name: string;
      last_name: string;
      email: string;
    };
  }>;
}

interface CreateSplitBillDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: Friend[];
  onSuccess: () => void;
}

function CreateSplitBillDialog({ open, onOpenChange, friends, onSuccess }: CreateSplitBillDialogProps) {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      total_amount: 0,
      selected_friends: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!profile) return;

    setLoading(true);
    try {
      // Create split bill
      const { data: billData, error: billError } = await supabase
        .from('split_bills')
        .insert({
          creator_id: profile.id,
          title: values.title,
          description: values.description,
          total_amount: values.total_amount,
          currency: 'NPR',
          split_type: 'equal',
          status: 'active',
        })
        .select()
        .single();

      if (billError) throw billError;

      // Calculate equal share (including creator)
      const participants = [...values.selected_friends, profile.id];
      const shareAmount = values.total_amount / participants.length;

      // Add participants
      const participantsData = participants.map(userId => ({
        split_bill_id: billData.id,
        user_id: userId,
        share_amount: shareAmount,
        paid_amount: 0,
        status: 'pending',
      }));

      const { error: participantsError } = await supabase
        .from('split_bill_participants')
        .insert(participantsData);

      if (participantsError) throw participantsError;

      showSuccess('Split bill created successfully!');
      form.reset();
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating split bill:', error);
      showError(error.message || 'Failed to create split bill');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Create Split Bill
          </DialogTitle>
          <DialogDescription>
            Split a bill equally among friends
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bill Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Dinner at Restaurant" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Add details about the bill..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="total_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Amount (NPR)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selected_friends"
              render={() => (
                <FormItem>
                  <FormLabel>Split With</FormLabel>
                  <FormDescription>
                    Select friends to split this bill with (you will be included automatically)
                  </FormDescription>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {friends.map((friend) => {
                      const name = friend.friend_profile.first_name && friend.friend_profile.last_name
                        ? `${friend.friend_profile.first_name} ${friend.friend_profile.last_name}`
                        : friend.friend_profile.email;
                      return (
                        <FormField
                          key={friend.friend_id}
                          control={form.control}
                          name="selected_friends"
                          render={({ field }) => (
                            <FormItem className="flex items-center space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(friend.friend_id)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, friend.friend_id])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== friend.friend_id)
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal cursor-pointer">
                                {name}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      );
                    })}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Split Bill'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function SplitBills() {
  const { profile } = useProfile();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [splitBills, setSplitBills] = useState<SplitBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchFriends();
      fetchSplitBills();
    }
  }, [profile]);

  const fetchFriends = async () => {
    if (!profile) return;

    const { data: friendsData } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, status')
      .eq('user_id', profile.id)
      .eq('status', 'accepted');

    if (!friendsData || friendsData.length === 0) {
      setFriends([]);
      return;
    }

    const friendIds = friendsData.map(f => f.friend_id);
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', friendIds);

    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    const combinedFriends = friendsData.map(friend => ({
      ...friend,
      friend_profile: profilesMap.get(friend.friend_id) || { 
        first_name: '', 
        last_name: '', 
        email: 'Unknown'
      }
    }));

    setFriends(combinedFriends);
  };

  const fetchSplitBills = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Get bills where user is creator or participant
      const { data: billsData, error: billsError } = await supabase
        .from('split_bills')
        .select('*')
        .or(`creator_id.eq.${profile.id}`)
        .order('created_at', { ascending: false });

      if (billsError) {
        console.error('Error fetching split bills:', billsError);
        if (billsError.message.includes('does not exist')) {
          showError('Split bills system not set up. Please run MONEY_REQUEST_SYSTEM.sql in Supabase.');
        }
        setLoading(false);
        return;
      }

      if (!billsData) {
        setSplitBills([]);
        setLoading(false);
        return;
      }

      // Get participants for all bills
      const billIds = billsData.map(b => b.id);
      const { data: participantsData } = await supabase
        .from('split_bill_participants')
        .select('*')
        .in('split_bill_id', billIds);

      // Get user profiles
      const userIds = new Set<string>();
      participantsData?.forEach(p => userIds.add(p.user_id));
      
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', Array.from(userIds));

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      // Combine data
      const enrichedBills = billsData.map(bill => ({
        ...bill,
        participants: (participantsData || [])
          .filter(p => p.split_bill_id === bill.id)
          .map(p => ({
            ...p,
            user: profilesMap.get(p.user_id) || { first_name: '', last_name: '', email: 'Unknown' }
          }))
      }));

      setSplitBills(enrichedBills);
    } catch (error: any) {
      console.error('Unexpected error:', error);
      showError('Failed to load split bills');
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (participantId: string, shareAmount: number) => {
    const { error } = await supabase
      .from('split_bill_participants')
      .update({ 
        status: 'paid',
        paid_amount: shareAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', participantId);

    if (error) {
      showError('Failed to mark as paid');
    } else {
      showSuccess('Marked as paid!');
      fetchSplitBills();
    }
  };

  const getUserName = (user: any) => {
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Split Bills</h1>
          <p className="text-muted-foreground">Split expenses with friends easily</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Create Split Bill
        </Button>
      </div>

      {friends.length === 0 && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardContent className="pt-6">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You need friends to split bills! Add friends first from the Friends page.
            </p>
          </CardContent>
        </Card>
      )}

      {splitBills.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No split bills yet</p>
            <p className="text-sm text-muted-foreground">Create your first split bill to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6">
          {splitBills.map((bill) => {
            const paidCount = bill.participants.filter(p => p.status === 'paid').length;
            const totalParticipants = bill.participants.length;

            return (
              <Card key={bill.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{bill.title}</CardTitle>
                      {bill.description && (
                        <CardDescription className="mt-1">{bill.description}</CardDescription>
                      )}
                    </div>
                    <Badge variant={bill.status === 'settled' ? 'secondary' : 'default'}>
                      {bill.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="text-2xl font-bold text-primary">
                      NPR {bill.total_amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {paidCount}/{totalParticipants} paid
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="h-4 w-4" />
                      Participants:
                    </div>
                    {bill.participants.map((participant) => {
                      const isCurrentUser = participant.user_id === profile?.id;
                      return (
                        <div
                          key={participant.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {getUserName(participant.user)}
                              {isCurrentUser && <span className="text-xs text-muted-foreground ml-2">(You)</span>}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Share: NPR {participant.share_amount.toLocaleString()}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {participant.status === 'paid' ? (
                              <Badge variant="secondary">
                                <Check className="h-3 w-3 mr-1" />
                                Paid
                              </Badge>
                            ) : (
                              isCurrentUser && (
                                <Button
                                  size="sm"
                                  onClick={() => markAsPaid(participant.id, participant.share_amount)}
                                >
                                  <Check className="h-4 w-4 mr-2" />
                                  Mark Paid
                                </Button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateSplitBillDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        friends={friends}
        onSuccess={() => {
          fetchSplitBills();
          setShowCreateDialog(false);
        }}
      />
    </div>
  );
}
