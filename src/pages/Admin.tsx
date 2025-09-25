import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
  profiles: {
    username: string;
  } | null;
}

const AdminPage = () => {
  const user = useUser();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdminStatusAndFetchData = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileData?.role !== 'admin') {
        showError("Access Denied. You are not an admin.");
        navigate('/');
        return;
      }
      setIsAdmin(true);

      const { data: accountsData, error } = await supabase
        .from('accounts')
        .select('id, name, type, balance, profiles(username)');
      
      if (error) {
        showError('Failed to fetch accounts.');
      } else if (accountsData) {
        // The Supabase join returns `profiles` as an array. We convert it to an object or null.
        const correctlyTypedAccounts = accountsData.map((account: any) => ({
          ...account,
          profiles: account.profiles?.[0] || null,
        }));
        setAccounts(correctlyTypedAccounts);
      }
      setLoading(false);
    };

    checkAdminStatusAndFetchData();
  }, [user, navigate]);

  const handleDeleteAccount = async (accountId: string) => {
    const { error } = await supabase.from('accounts').delete().eq('id', accountId);
    if (error) {
      showError('Failed to delete account.');
    } else {
      showSuccess('Account deleted successfully.');
      setAccounts(accounts.filter(acc => acc.id !== accountId));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel - All Accounts</h1>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">View and manage all user accounts in the system.</p>
        </div>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Account Name</TableHead>
                <TableHead>Owner (Username)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.length > 0 ? accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell className="font-medium">{account.name}</TableCell>
                  <TableCell>{account.profiles?.username || 'Unknown'}</TableCell>
                  <TableCell>{account.type}</TableCell>
                  <TableCell className="text-right">{new Intl.NumberFormat('en-NP', { style: 'currency', currency: 'NPR' }).format(account.balance)}</TableCell>
                  <TableCell className="text-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="icon">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the account "{account.name}" owned by {account.profiles?.username || 'an unknown user'}.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteAccount(account.id)}>
                            Delete Account
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No accounts found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPage;