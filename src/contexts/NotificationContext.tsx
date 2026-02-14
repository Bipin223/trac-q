import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './ProfileContext';
import { parseISO, isToday } from 'date-fns';

interface NotificationContextType {
  recurringCount: number;
  todayCount: number;
  upcomingCount: number;
  moneyRequestsCount: number;
  friendRequestsCount: number;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useProfile();
  const [recurringCount, setRecurringCount] = useState(0);
  const [todayCount, setTodayCount] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [moneyRequestsCount, setMoneyRequestsCount] = useState(0);
  const [friendRequestsCount, setFriendRequestsCount] = useState(0);

  const fetchNotificationCounts = useCallback(async () => {
    if (!profile) {
      setRecurringCount(0);
      setTodayCount(0);
      setUpcomingCount(0);
      setMoneyRequestsCount(0);
      setFriendRequestsCount(0);
      return;
    }

    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + 5);
      
      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const [incomesRes, expensesRes, moneyRequestsRes, friendRequestsRes] = await Promise.all([
        supabase
          .from('incomes')
          .select('id, income_date')
          .eq('user_id', profile.id)
          .eq('is_recurring', true)
          .gte('income_date', todayStr)
          .lte('income_date', futureDateStr),
        supabase
          .from('expenses')
          .select('id, expense_date')
          .eq('user_id', profile.id)
          .eq('is_recurring', true)
          .gte('expense_date', todayStr)
          .lte('expense_date', futureDateStr),
        supabase
          .from('money_requests')
          .select('id')
          .eq('to_user_id', profile.id)
          .eq('status', 'pending'),
        supabase
          .from('friends')
          .select('id')
          .eq('user_id', profile.id)
          .eq('status', 'pending'),
      ]);

      const allItems = [
        ...(incomesRes.data || []).map(i => parseISO(i.income_date)),
        ...(expensesRes.data || []).map(e => parseISO(e.expense_date)),
      ];

      const todayItems = allItems.filter(date => isToday(date));
      const upcomingItems = allItems.filter(date => !isToday(date));

      setRecurringCount(allItems.length);
      setTodayCount(todayItems.length);
      setUpcomingCount(upcomingItems.length);
      setMoneyRequestsCount(moneyRequestsRes.data?.length || 0);
      setFriendRequestsCount(friendRequestsRes.data?.length || 0);
    } catch (error) {
      console.error('Error fetching notification counts:', error);
    }
  }, [profile]);

  useEffect(() => {
    fetchNotificationCounts();
    
    if (!profile) return;

    // Set up real-time subscription for money requests
    const moneyRequestSubscription = supabase
      .channel(`money_requests_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'money_requests',
          filter: `to_user_id=eq.${profile.id}`,
        },
        () => {
          fetchNotificationCounts();
        }
      )
      .subscribe();

    // Set up real-time subscription for friend requests
    const friendRequestSubscription = supabase
      .channel(`friend_requests_${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${profile.id}`,
        },
        () => {
          fetchNotificationCounts();
        }
      )
      .subscribe();

    // Refresh every minute as fallback
    const interval = setInterval(fetchNotificationCounts, 60000);

    return () => {
      clearInterval(interval);
      moneyRequestSubscription.unsubscribe();
      friendRequestSubscription.unsubscribe();
    };
  }, [fetchNotificationCounts, profile]);

  const refreshNotifications = useCallback(async () => {
    await fetchNotificationCounts();
  }, [fetchNotificationCounts]);

  return (
    <NotificationContext.Provider value={{ recurringCount, todayCount, upcomingCount, moneyRequestsCount, friendRequestsCount, refreshNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
