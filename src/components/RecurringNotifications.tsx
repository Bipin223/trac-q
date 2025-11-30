import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Clock, AlertTriangle, CheckCircle2, Edit } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { format, differenceInDays, isToday, parseISO } from 'date-fns';

interface RecurringNotification {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  dueDate: Date;
  daysUntil: number;
  isToday: boolean;
  recurring_frequency?: string;
  recurring_day?: number;
}

interface RecurringNotificationsProps {
  onNotificationUpdate?: () => void;
}

export function RecurringNotifications({ onNotificationUpdate }: RecurringNotificationsProps) {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<RecurringNotification[]>([]);
  const [todayNotifications, setTodayNotifications] = useState<RecurringNotification[]>([]);
  const [upcomingNotifications, setUpcomingNotifications] = useState<RecurringNotification[]>([]);
  const [selectedNotification, setSelectedNotification] = useState<RecurringNotification | null>(null);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);
  const [actionType, setActionType] = useState<'mark-done' | 'edit' | 'skip'>('mark-done');
  
  // Form state for editing
  const [editAmount, setEditAmount] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDate, setEditDate] = useState('');

  const fetchRecurringNotifications = useCallback(async () => {
    if (!profile) return;

    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 5); // 5 days advance notice
      
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      // Fetch recurring incomes
      const { data: incomes, error: incomesError } = await supabase
        .from('incomes')
        .select('id, amount, description, income_date, category_id, recurring_frequency, recurring_day')
        .eq('user_id', profile.id)
        .eq('is_recurring', true)
        .gte('income_date', todayStr)
        .lte('income_date', futureDateStr);

      if (incomesError) {
        console.error('Error fetching recurring incomes:', incomesError);
      }

      // Fetch recurring expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, amount, description, expense_date, category_id, recurring_frequency, recurring_day')
        .eq('user_id', profile.id)
        .eq('is_recurring', true)
        .gte('expense_date', todayStr)
        .lte('expense_date', futureDateStr);

      if (expensesError) {
        console.error('Error fetching recurring expenses:', expensesError);
      }

      // Fetch category names separately
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
        
        categories?.forEach(cat => {
          categoriesMap.set(cat.id, cat.name);
        });
      }

      const processedIncomes: RecurringNotification[] = (incomes || []).map(item => {
        const dueDate = parseISO(item.income_date);
        return {
          id: item.id,
          type: 'income' as const,
          amount: item.amount,
          description: item.description || 'Income',
          category: categoriesMap.get(item.category_id) || 'Uncategorized',
          dueDate,
          daysUntil: differenceInDays(dueDate, today),
          isToday: isToday(dueDate),
          recurring_frequency: item.recurring_frequency,
          recurring_day: item.recurring_day,
        };
      });

      const processedExpenses: RecurringNotification[] = (expenses || []).map(item => {
        const dueDate = parseISO(item.expense_date);
        return {
          id: item.id,
          type: 'expense' as const,
          amount: item.amount,
          description: item.description || 'Expense',
          category: categoriesMap.get(item.category_id) || 'Uncategorized',
          dueDate,
          daysUntil: differenceInDays(dueDate, today),
          isToday: isToday(dueDate),
          recurring_frequency: item.recurring_frequency,
          recurring_day: item.recurring_day,
        };
      });

      const allNotifications = [...processedIncomes, ...processedExpenses].sort(
        (a, b) => a.daysUntil - b.daysUntil
      );

      setNotifications(allNotifications);
      setTodayNotifications(allNotifications.filter(n => n.isToday));
      setUpcomingNotifications(allNotifications.filter(n => !n.isToday));
    } catch (error) {
      console.error('Error fetching recurring notifications:', error);
    }
  }, [profile]);

  useEffect(() => {
    fetchRecurringNotifications();
    
    // Refresh notifications every minute
    const interval = setInterval(fetchRecurringNotifications, 60000);
    return () => clearInterval(interval);
  }, [fetchRecurringNotifications]);

  const handleNotificationClick = (notification: RecurringNotification, action: 'mark-done' | 'edit' | 'skip') => {
    setSelectedNotification(notification);
    setActionType(action);
    setEditAmount(notification.amount.toString());
    setEditDescription(notification.description);
    setEditDate(format(notification.dueDate, 'yyyy-MM-dd'));
    setShowActionDialog(true);
  };

  const calculateNextOccurrence = (frequency: string, customDay?: number) => {
    const today = new Date();
    const next = new Date(today);

    switch (frequency) {
      case 'daily':
        next.setDate(today.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(today.getDate() + 7);
        break;
      case 'monthly':
        if (customDay && customDay > 0 && customDay <= 31) {
          next.setMonth(today.getMonth() + 1);
          next.setDate(Math.min(customDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        } else {
          next.setMonth(today.getMonth() + 1);
        }
        break;
      case 'yearly':
        next.setFullYear(today.getFullYear() + 1);
        break;
      case 'custom':
        if (customDay && customDay > 0 && customDay <= 31) {
          next.setMonth(today.getMonth() + 1);
          next.setDate(Math.min(customDay, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
        } else {
          next.setMonth(today.getMonth() + 1);
        }
        break;
      default:
        next.setMonth(today.getMonth() + 1);
    }

    return next.toISOString().split('T')[0];
  };

  const handleMarkAsDone = async () => {
    if (!selectedNotification || !profile) return;

    try {
      const table = selectedNotification.type === 'income' ? 'incomes' : 'expenses';
      const dateField = selectedNotification.type === 'income' ? 'income_date' : 'expense_date';
      
      // Get the original record to preserve recurring settings
      const { data: original } = await supabase
        .from(table)
        .select('*')
        .eq('id', selectedNotification.id)
        .single();

      if (!original) {
        showError('Transaction not found');
        return;
      }

      // Calculate next occurrence date
      const nextDate = calculateNextOccurrence(
        original.recurring_frequency || 'monthly',
        original.recurring_day
      );

      // Update the existing recurring transaction with new date
      const { error: updateError } = await supabase
        .from(table)
        .update({
          [dateField]: nextDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedNotification.id);

      if (updateError) throw updateError;

      // Create a completed instance of this recurring transaction
      const { error: createError } = await supabase
        .from(table)
        .insert({
          user_id: profile.id,
          amount: actionType === 'edit' ? parseFloat(editAmount) : selectedNotification.amount,
          description: actionType === 'edit' ? editDescription : selectedNotification.description,
          [dateField]: actionType === 'edit' ? editDate : format(selectedNotification.dueDate, 'yyyy-MM-dd'),
          category_id: original.category_id,
          subcategory_id: original.subcategory_id || null,
          is_recurring: false, // This is the completed instance
          created_at: new Date().toISOString(),
        });

      if (createError) throw createError;

      showSuccess(`${selectedNotification.type === 'income' ? 'Income' : 'Expense'} marked as completed and scheduled for next occurrence`);
      setShowActionDialog(false);
      fetchRecurringNotifications();
      onNotificationUpdate?.();
    } catch (error: unknown) {
      console.error('Error marking as done:', error);
      showError(error instanceof Error ? error.message : 'Failed to update transaction');
    }
  };

  const handleSkip = async () => {
    if (!selectedNotification) return;

    try {
      const table = selectedNotification.type === 'income' ? 'incomes' : 'expenses';
      const dateField = selectedNotification.type === 'income' ? 'income_date' : 'expense_date';
      
      const { data: original } = await supabase
        .from(table)
        .select('recurring_frequency, recurring_day')
        .eq('id', selectedNotification.id)
        .single();

      if (!original) return;

      const nextDate = calculateNextOccurrence(
        original.recurring_frequency || 'monthly',
        original.recurring_day
      );

      const { error } = await supabase
        .from(table)
        .update({ [dateField]: nextDate })
        .eq('id', selectedNotification.id);

      if (error) throw error;

      showSuccess('Transaction skipped to next occurrence');
      setShowActionDialog(false);
      fetchRecurringNotifications();
      onNotificationUpdate?.();
    } catch (error: unknown) {
      console.error('Error skipping:', error);
      showError(error instanceof Error ? error.message : 'Failed to skip transaction');
    }
  };

  const handleDismissAll = async () => {
    try {
      // Skip all today notifications to next occurrence
      for (const notification of todayNotifications) {
        const table = notification.type === 'income' ? 'incomes' : 'expenses';
        const dateField = notification.type === 'income' ? 'income_date' : 'expense_date';
        
        const { data: original } = await supabase
          .from(table)
          .select('recurring_frequency, recurring_day')
          .eq('id', notification.id)
          .single();

        if (original) {
          const nextDate = calculateNextOccurrence(
            original.recurring_frequency || 'monthly',
            original.recurring_day
          );

          await supabase
            .from(table)
            .update({ [dateField]: nextDate })
            .eq('id', notification.id);
        }
      }

      showSuccess('All notifications dismissed');
      setShowDismissConfirm(false);
      fetchRecurringNotifications();
      onNotificationUpdate?.();
    } catch (error: unknown) {
      console.error('Error dismissing all:', error);
      showError('Failed to dismiss all notifications');
    }
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return 'Today';
    if (days === 1) return 'Tomorrow';
    return `In ${days} days`;
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <>
      {/* Today's Notifications - Prominent Alert */}
      {todayNotifications.length > 0 && (
        <Alert className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-300 dark:border-orange-700">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          <AlertTitle className="text-orange-900 dark:text-orange-100 font-semibold flex items-center justify-between">
            <span>Recurring Items Due Today ({todayNotifications.length})</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDismissConfirm(true)}
              className="text-orange-600 hover:text-orange-700"
            >
              Dismiss All
            </Button>
          </AlertTitle>
          <AlertDescription>
            <div className="mt-3 space-y-2">
              {todayNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'income' 
                        ? 'bg-green-100 dark:bg-green-900/40' 
                        : 'bg-red-100 dark:bg-red-900/40'
                    }`}>
                      {notification.type === 'income' ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.description}</p>
                      <p className="text-xs text-muted-foreground">{notification.category}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        notification.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        NPR {notification.amount.toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs border-orange-600 text-orange-600 mt-1">
                        Due Today
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => handleNotificationClick(notification, 'mark-done')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Pay
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleNotificationClick(notification, 'edit')}
                    >
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleNotificationClick(notification, 'skip')}
                    >
                      Skip
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Upcoming Notifications - Informational */}
      {upcomingNotifications.length > 0 && (
        <Alert className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-300 dark:border-blue-700">
          <Clock className="h-5 w-5 text-blue-600" />
          <AlertTitle className="text-blue-900 dark:text-blue-100 font-semibold">
            Upcoming Recurring Items (Next 5 Days)
          </AlertTitle>
          <AlertDescription>
            <div className="mt-3 space-y-2">
              {upcomingNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-blue-200 dark:border-blue-800"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{notification.description}</p>
                      <p className="text-xs text-muted-foreground">{notification.category}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${
                        notification.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        NPR {notification.amount.toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs border-blue-600 text-blue-600 mt-1">
                        {getDaysLabel(notification.daysUntil)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === 'mark-done' && 'Complete Recurring Transaction'}
              {actionType === 'edit' && 'Edit & Complete Transaction'}
              {actionType === 'skip' && 'Skip This Occurrence'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'mark-done' && 'This will create a completed transaction and schedule the next occurrence.'}
              {actionType === 'edit' && 'Make any necessary changes before marking as complete.'}
              {actionType === 'skip' && 'This will skip this occurrence and schedule the next one.'}
            </DialogDescription>
          </DialogHeader>

          {selectedNotification && (
            <div className="space-y-4 py-4">
              {actionType === 'edit' ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (NPR)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={editAmount}
                      onChange={(e) => setEditAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Enter description"
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
                </>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Type:</span>
                    <span className="text-sm font-medium capitalize">{selectedNotification.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Amount:</span>
                    <span className="text-sm font-medium">NPR {selectedNotification.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Description:</span>
                    <span className="text-sm font-medium">{selectedNotification.description}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Category:</span>
                    <span className="text-sm font-medium">{selectedNotification.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Due Date:</span>
                    <span className="text-sm font-medium">{format(selectedNotification.dueDate, 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={actionType === 'skip' ? handleSkip : handleMarkAsDone}
              className={actionType === 'skip' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {actionType === 'mark-done' && 'Pay'}
              {actionType === 'edit' && 'Save & Complete'}
              {actionType === 'skip' && 'Skip to Next'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dismiss All Confirmation */}
      <AlertDialog open={showDismissConfirm} onOpenChange={setShowDismissConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Dismiss All Today's Notifications?</AlertDialogTitle>
            <AlertDialogDescription>
              This will skip all {todayNotifications.length} recurring items to their next occurrence without creating completed transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDismissAll} className="bg-orange-600 hover:bg-orange-700">
              Dismiss All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
