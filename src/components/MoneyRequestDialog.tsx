import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, DollarSign, Send, HandCoins } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  friend_id: z.string({ required_error: 'Please select a friend' }),
  amount: z.coerce.number().positive({ message: 'Amount must be positive' }),
  description: z.string().min(1, { message: 'Please add a description' }),
  request_type: z.enum(['request_money', 'send_money']),
  due_date: z.date().optional(),
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

interface MoneyRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  friends: Friend[];
  onSuccess: () => void;
  defaultFriendId?: string;
  defaultType?: 'request_money' | 'send_money';
}

export function MoneyRequestDialog({
  open,
  onOpenChange,
  friends,
  onSuccess,
  defaultFriendId,
  defaultType = 'request_money',
}: MoneyRequestDialogProps) {
  const { profile } = useProfile();
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingValues, setPendingValues] = useState<z.infer<typeof formSchema> | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      friend_id: defaultFriendId || '',
      amount: 0,
      description: '',
      request_type: defaultType,
      due_date: undefined,
    },
  });

  const requestType = form.watch('request_type');

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setPendingValues(values);
    setShowConfirmation(true);
  };

  const confirmSubmit = async () => {
    if (!profile || !pendingValues) return;

    setLoading(true);
    setShowConfirmation(false);
    try {
      const requestData: any = {
        from_user_id: profile.id,
        to_user_id: pendingValues.friend_id,
        amount: pendingValues.amount,
        currency: 'NPR',
        description: pendingValues.description,
        request_type: pendingValues.request_type,
        status: 'pending',
      };

      if (pendingValues.due_date) {
        requestData.due_date = pendingValues.due_date.toISOString();
      }

      const { error } = await supabase
        .from('money_requests')
        .insert(requestData);

      if (error) throw error;

      const actionText = pendingValues.request_type === 'request_money' 
        ? 'Money request sent' 
        : 'Payment request sent';
      
      showSuccess(`${actionText} successfully!`);
      form.reset();
      setPendingValues(null);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating money request:', error);
      showError(error.message || 'Failed to create request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {requestType === 'request_money' ? (
              <>
                <HandCoins className="h-5 w-5" />
                Request Money
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                Send Money
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {requestType === 'request_money'
              ? 'Request money from a friend. They will be notified and can accept or decline.'
              : 'Send money to a friend. This will create a payment request for you to fulfill.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="request_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="request_money">
                        <div className="flex items-center gap-2">
                          <HandCoins className="h-4 w-4" />
                          Request Money (I need money)
                        </div>
                      </SelectItem>
                      <SelectItem value="send_money">
                        <div className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Send Money (I will pay)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="friend_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {requestType === 'request_money' ? 'Request From' : 'Send To'}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a friend" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {friends.map((friend) => {
                        const name = friend.friend_profile.first_name && friend.friend_profile.last_name
                          ? `${friend.friend_profile.first_name} ${friend.friend_profile.last_name}`
                          : friend.friend_profile.email;
                        return (
                          <SelectItem key={friend.friend_id} value={friend.friend_id}>
                            {name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (NPR)</FormLabel>
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="What is this for? (e.g., Lunch, Movie tickets, Rent)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Add details about this {requestType === 'request_money' ? 'request' : 'payment'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date (Optional)</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          {field.value ? (
                            format(field.value, 'PPP')
                          ) : (
                            <span>Pick a due date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    When do you need this {requestType === 'request_money' ? 'money' : 'payment'}?
                  </FormDescription>
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
                {loading ? 'Sending...' : 'Send Request'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Confirmation Dialog */}
    <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirm Money Request</AlertDialogTitle>
          <AlertDialogDescription>
            {pendingValues && (
              <div className="space-y-2">
                <p>
                  You are about to {pendingValues.request_type === 'request_money' ? 'request' : 'send'} 
                  <span className="font-semibold"> NPR {pendingValues.amount.toLocaleString()}</span> 
                  {pendingValues.request_type === 'request_money' ? ' from ' : ' to '}
                  <span className="font-semibold">
                    {friends.find(f => f.friend_id === pendingValues.friend_id)?.friend_profile.first_name} 
                    {friends.find(f => f.friend_id === pendingValues.friend_id)?.friend_profile.last_name}
                  </span>
                </p>
                {pendingValues.description && (
                  <p className="text-sm text-muted-foreground">
                    Description: {pendingValues.description}
                  </p>
                )}
                {pendingValues.due_date && (
                  <p className="text-sm text-muted-foreground">
                    Due date: {format(pendingValues.due_date, 'PPP')}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone. The recipient will be notified immediately.
                </p>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={() => setShowConfirmation(false)}>
            Cancel
          </AlertDialogAction>
          <AlertDialogAction onClick={confirmSubmit} className="bg-primary">
            {loading ? 'Sending...' : 'Confirm & Send'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
