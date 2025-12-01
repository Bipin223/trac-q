import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Clock, CheckCircle2, Edit, XCircle, Calendar } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { format, differenceInDays, differenceInHours, isToday, parseISO, addDays, addMonths, addYears, isBefore, isAfter } from 'date-fns';

interface RecurringNotification {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  dueDate: Date;
  daysUntil: number;
  hoursUntil?: number;
  isToday: boolean;
  recurring_frequency?: string;
  recurring_day?: number;
}

interface NotificationPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: () => void;
}

const calculateNextDueDate = (lastDate: Date, frequency: string): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  let nextDate = new Date(lastDate);
  nextDate.setHours(0, 0, 0, 0);

  if (isAfter(nextDate, today)) {
    return nextDate;
  }

  switch (frequency) {
    case 'daily':
      while (isBefore(nextDate, today)) {
        nextDate = addDays(nextDate, 1);
      }
      break;
    case 'weekly':
      while (isBefore(nextDate, today)) {
        nextDate = addDays(nextDate, 7);
      }
      break;
    case 'monthly':
      while (isBefore(nextDate, today)) {
        nextDate = addMonths(nextDate, 1);
      }
      break;
    case 'yearly':
      while (isBefore(nextDate, today)) {
        nextDate = addYears(nextDate, 1);
      }
      break;
  }

  return nextDate;
};

const shouldShowNotification = (daysUntil: number, hoursUntil: number, frequency: string): boolean => {
  switch (frequency) {
    case 'daily':
      return hoursUntil <= 5 && hoursUntil >= 0;
    case 'weekly':
    case 'monthly':
    case 'yearly':
      return daysUntil <= 5 && daysUntil >= 0;
    default:
      return daysUntil <= 5 && daysUntil >= 0;
  }
};

export function NotificationPanel({ open, onOpenChange, onUpdate }: NotificationPanelProps) {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<RecurringNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<RecurringNotification | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [actionType, setActionType] = useState<'mark-done' | 'edit' | 'skip'>('mark-done');
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');
  const [animatingItems, setAnimatingItems] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    if (!profile) return;

    try {
      const today = new Date();

      const { data: incomes } = await supabase
        .from('incomes')
        .select('id, amount, description, income_date, category_id, recurring_frequency, recurring_day')
        .eq('user_id', profile.id)
        .eq('is_recurring', true);

      const { data: expenses } = await supabase
        .from('expenses')
        .select('id, amount, description, expense_date, category_id, recurring_frequency, recurring_day')
        .eq('user_id', profile.id)
        .eq('is_recurring', true);

      const categoryIds = [
        ...(incomes || []).map(i => i.category_id),
        ...(expenses || []).map(e => e.category_id)
      ].filter(Boolean);

      const categoriesMap = new Map<string, string>();
      if (categoryIds.length > 0) {
        const { data: categories } = await supabase
          .from('categories')
          .select('id, name')
          .in('id', categoryIds);
        
        categories?.forEach(cat => categoriesMap.set(cat.id, cat.name));
      }

      const processItems = (items: Array<{
        id: string;
        amount: number;
        description: string;
        category_id: string;
        recurring_frequency?: string;
        recurring_day?: number;
        [key: string]: any;
      }>, type: 'income' | 'expense', dateField: string) => {
        return (items || [])
          .map(item => {
            const lastDate = parseISO(item[dateField]);
            const nextDueDate = calculateNextDueDate(lastDate, item.recurring_frequency || 'monthly');
            const daysUntil = differenceInDays(nextDueDate, today);
            const hoursUntil = differenceInHours(nextDueDate, new Date());

            return {
              id: item.id,
              type,
              amount: item.amount,
              description: item.description || (type === 'income' ? 'Income' : 'Expense'),
              category: categoriesMap.get(item.category_id) || 'Uncategorized',
              dueDate: nextDueDate,
              daysUntil,
              hoursUntil,
              isToday: isToday(nextDueDate),
              recurring_frequency: item.recurring_frequency,
              recurring_day: item.recurring_day,
            };
          })
          .filter(item => shouldShowNotification(item.daysUntil, item.hoursUntil || 0, item.recurring_frequency || 'monthly'));
      };

      const allNotifications = [
        ...processItems(incomes || [], 'income', 'income_date'),
        ...processItems(expenses || [], 'expense', 'expense_date')
      ].sort((a, b) => a.daysUntil - b.daysUntil);

      // Trigger animation for new notifications
      const newIds = new Set(allNotifications.map(n => n.id));
      const oldIds = new Set(notifications.map(n => n.id));
      const addedIds = new Set([...newIds].filter(id => !oldIds.has(id)));
      
      if (addedIds.size > 0) {
        setAnimatingItems(addedIds);
        setTimeout(() => setAnimatingItems(new Set()), 1000);
      }

      setNotifications(allNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [profile, notifications]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  useEffect(() => {
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAsDone = async (notification: RecurringNotification) => {
    try {
      const table = notification.type === 'income' ? 'incomes' : 'expenses';
      const dateField = notification.type === 'income' ? 'income_date' : 'expense_date';
      
      const completedDate = format(notification.dueDate, 'yyyy-MM-dd');
      
      const newTransactionData = {
        user_id: profile?.id,
        amount: parseFloat(editAmount) || notification.amount,
        description: editDescription || notification.description,
        category_id: null,
        [dateField]: completedDate,
        is_recurring: false,
      };

      const { error: insertError } = await supabase
        .from(table)
        .insert(newTransactionData);

      if (insertError) throw insertError;

      const nextDueDate = calculateNextDueDate(notification.dueDate, notification.recurring_frequency || 'monthly');
      
      const { error: updateError } = await supabase
        .from(table)
        .update({ [dateField]: format(nextDueDate, 'yyyy-MM-dd') })
        .eq('id', notification.id);

      if (updateError) throw updateError;

      showSuccess('Transaction marked as complete!');
      setShowActionDialog(false);
      setSelectedNotification(null);
      fetchNotifications();
      onUpdate?.();
    } catch (error) {
      showError('Failed to complete transaction');
      console.error(error);
    }
  };

  const handleSkip = async (notification: RecurringNotification) => {
    try {
      const table = notification.type === 'income' ? 'incomes' : 'expenses';
      const dateField = notification.type === 'income' ? 'income_date' : 'expense_date';
      
      const nextDueDate = calculateNextDueDate(notification.dueDate, notification.recurring_frequency || 'monthly');
      
      const { error } = await supabase
        .from(table)
        .update({ [dateField]: format(nextDueDate, 'yyyy-MM-dd') })
        .eq('id', notification.id);

      if (error) throw error;

      showSuccess('Transaction skipped');
      setShowDismissConfirm(false);
      setSelectedNotification(null);
      fetchNotifications();
      onUpdate?.();
    } catch (error) {
      showError('Failed to skip transaction');
      console.error(error);
    }
  };

  const openActionDialog = (notification: RecurringNotification, action: 'mark-done' | 'edit' | 'skip') => {
    setSelectedNotification(notification);
    setActionType(action);
    setEditAmount(notification.amount.toString());
    setEditDescription(notification.description);
    setEditDate(format(notification.dueDate, 'yyyy-MM-dd'));
    
    if (action === 'skip') {
      setShowDismissConfirm(true);
    } else {
      setShowActionDialog(true);
    }
  };

  const getDaysLabel = (notification: RecurringNotification) => {
    if (notification.recurring_frequency === 'daily' && notification.hoursUntil !== undefined) {
      if (notification.hoursUntil === 0) return 'Due now';
      return `${notification.hoursUntil} hour${notification.hoursUntil !== 1 ? 's' : ''}`;
    }
    if (notification.isToday) return 'Today';
    if (notification.daysUntil === 1) return 'Tomorrow';
    return `${notification.daysUntil} days`;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:w-[450px] sm:max-w-[450px]">
          <SheetHeader>
            <SheetTitle>Recurring Transactions</SheetTitle>
            <SheetDescription>
              Manage your upcoming recurring transactions
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-120px)] mt-6">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No upcoming recurring transactions</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`
                      p-4 rounded-lg border transition-all duration-500
                      ${notification.isToday 
                        ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800' 
                        : 'bg-card border-border hover:border-primary/50'
                      }
                      ${animatingItems.has(notification.id) 
                        ? 'animate-in fade-in slide-in-from-right-5' 
                        : ''
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={notification.type === 'income' ? 'default' : 'destructive'} className="text-xs">
                            {notification.type}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {getDaysLabel(notification)}
                          </Badge>
                        </div>
                        <h4 className="font-semibold truncate">{notification.description}</h4>
                        <p className="text-sm text-muted-foreground">{notification.category}</p>
                        <p className="text-lg font-bold mt-1">
                          NPR {notification.amount.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          <Calendar className="inline h-3 w-3 mr-1" />
                          {format(notification.dueDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => openActionDialog(notification, 'mark-done')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openActionDialog(notification, 'edit')}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openActionDialog(notification, 'skip')}
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'mark-done' ? 'Complete Transaction' : 'Edit Transaction'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'mark-done' 
                ? 'Mark this recurring transaction as complete and schedule the next occurrence.' 
                : 'Modify the transaction details before marking as complete.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount (NPR)</Label>
              <Input
                id="amount"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>Cancel</Button>
            <Button onClick={() => selectedNotification && handleMarkAsDone(selectedNotification)}>
              Complete Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Skip Confirmation */}
      <AlertDialog open={showDismissConfirm} onOpenChange={setShowDismissConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skip this occurrence?</AlertDialogTitle>
            <AlertDialogDescription>
              This will move the recurring transaction to its next scheduled date without recording a completion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => selectedNotification && handleSkip(selectedNotification)}>
              Skip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
