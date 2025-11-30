import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { 
  HandCoins, 
  Send, 
  Check, 
  X, 
  Clock, 
  DollarSign,
  Calendar,
  User,
  ArrowDownLeft,
  ArrowUpRight
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

interface MoneyRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  currency: string;
  description: string;
  request_type: 'request_money' | 'send_money';
  status: 'pending' | 'accepted' | 'rejected' | 'completed' | 'cancelled';
  due_date: string | null;
  created_at: string;
  from_user: {
    first_name: string;
    last_name: string;
    email: string;
  };
  to_user: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function MoneyRequests() {
  const { profile } = useProfile();
  const [sentRequests, setSentRequests] = useState<MoneyRequest[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<MoneyRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('received');

  useEffect(() => {
    if (profile) {
      fetchMoneyRequests();
    }
  }, [profile]);

  const fetchMoneyRequests = async () => {
    if (!profile) return;
    setLoading(true);

    try {
      // Fetch sent requests
      const { data: sentData, error: sentError } = await supabase
        .from('money_requests')
        .select('id, from_user_id, to_user_id, amount, currency, description, request_type, status, due_date, created_at')
        .eq('from_user_id', profile.id)
        .order('created_at', { ascending: false });

      if (sentError) {
        console.error('Error fetching sent requests:', sentError);
        if (sentError.message.includes('does not exist')) {
          showError('Money request system not set up. Please run MONEY_REQUEST_SYSTEM.sql in Supabase.');
        }
        setLoading(false);
        return;
      }

      // Fetch received requests
      const { data: receivedData, error: receivedError } = await supabase
        .from('money_requests')
        .select('id, from_user_id, to_user_id, amount, currency, description, request_type, status, due_date, created_at')
        .eq('to_user_id', profile.id)
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error('Error fetching received requests:', receivedError);
        setLoading(false);
        return;
      }

      // Get user profiles for all requests
      const allUserIds = new Set<string>();
      [...(sentData || []), ...(receivedData || [])].forEach(req => {
        allUserIds.add(req.from_user_id);
        allUserIds.add(req.to_user_id);
      });

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', Array.from(allUserIds));

      const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const enrichData = (data: any[]) => data.map(req => ({
        ...req,
        from_user: profilesMap.get(req.from_user_id) || { first_name: '', last_name: '', email: 'Unknown' },
        to_user: profilesMap.get(req.to_user_id) || { first_name: '', last_name: '', email: 'Unknown' },
      }));

      setSentRequests(enrichData(sentData || []));
      setReceivedRequests(enrichData(receivedData || []));
    } catch (error: any) {
      console.error('Unexpected error:', error);
      showError('Failed to load money requests');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('money_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      showError('Failed to accept request');
    } else {
      showSuccess('Request accepted!');
      fetchMoneyRequests();
    }
  };

  const rejectRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('money_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      showError('Failed to reject request');
    } else {
      showSuccess('Request rejected');
      fetchMoneyRequests();
    }
  };

  const completeRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('money_requests')
      .update({ 
        status: 'completed', 
        updated_at: new Date().toISOString(),
        completed_at: new Date().toISOString()
      })
      .eq('id', requestId);

    if (error) {
      showError('Failed to mark as completed');
    } else {
      showSuccess('Marked as completed!');
      fetchMoneyRequests();
    }
  };

  const cancelRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('money_requests')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) {
      showError('Failed to cancel request');
    } else {
      showSuccess('Request cancelled');
      fetchMoneyRequests();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'default',
      accepted: 'secondary',
      rejected: 'destructive',
      completed: 'outline',
      cancelled: 'outline',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getUserName = (user: any) => {
    return user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.email;
  };

  const MoneyRequestCard = ({ request, isSent }: { request: MoneyRequest; isSent: boolean }) => {
    const otherUser = isSent ? request.to_user : request.from_user;
    const isRequestMoney = request.request_type === 'request_money';

    return (
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {isSent ? (
                  isRequestMoney ? (
                    <ArrowDownLeft className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  )
                ) : (
                  isRequestMoney ? (
                    <ArrowUpRight className="h-4 w-4 text-blue-600" />
                  ) : (
                    <ArrowDownLeft className="h-4 w-4 text-green-600" />
                  )
                )}
                <CardTitle className="text-lg">
                  NPR {request.amount.toLocaleString()}
                </CardTitle>
              </div>
              <CardDescription className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {isSent ? 'To: ' : 'From: '}{getUserName(otherUser)}
              </CardDescription>
              <p className="text-sm mt-2">{request.description}</p>
            </div>
            {getStatusBadge(request.status)}
          </div>
          {request.due_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
              <Calendar className="h-3 w-3" />
              Due: {format(new Date(request.due_date), 'PPP')}
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {format(new Date(request.created_at), 'PPP')}
          </div>
        </CardHeader>
        <CardContent>
          {!isSent && request.status === 'pending' && (
            <div className="flex gap-2">
              <Button 
                onClick={() => acceptRequest(request.id)} 
                size="sm" 
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Accept
              </Button>
              <Button 
                onClick={() => rejectRequest(request.id)} 
                variant="outline" 
                size="sm" 
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Decline
              </Button>
            </div>
          )}
          {isSent && request.status === 'pending' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <X className="h-4 w-4 mr-2" />
                  Cancel Request
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancel Request?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to cancel this money request?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No</AlertDialogCancel>
                  <AlertDialogAction onClick={() => cancelRequest(request.id)}>
                    Yes, Cancel
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {request.status === 'accepted' && (
            <Button 
              onClick={() => completeRequest(request.id)} 
              size="sm" 
              className="w-full"
              variant="outline"
            >
              <Check className="h-4 w-4 mr-2" />
              Mark as Paid
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
          <h1 className="text-3xl font-bold tracking-tight">Money Requests</h1>
          <p className="text-muted-foreground">Manage requests to send and receive money with friends</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="received" className="flex items-center gap-2">
            <ArrowDownLeft className="h-4 w-4" />
            Received ({receivedRequests.filter(r => r.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <ArrowUpRight className="h-4 w-4" />
            Sent ({sentRequests.filter(r => r.status === 'pending').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-6">
          {receivedRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <HandCoins className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No money requests received</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {receivedRequests.map((request) => (
                <MoneyRequestCard key={request.id} request={request} isSent={false} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="sent" className="mt-6">
          {sentRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Send className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No money requests sent</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sentRequests.map((request) => (
                <MoneyRequestCard key={request.id} request={request} isSent={true} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
