import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

export function DeleteAccountSection() {
  const user = useUser();
  const navigate = useNavigate();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!user) return;

    setDeleting(true);
    try {
      // Try to use the delete function if it exists
      const { error: rpcError } = await supabase.rpc('delete_user_account', {
        user_id_to_delete: user.id,
      });

      if (rpcError) {
        console.warn('RPC function not available, falling back to manual deletion:', rpcError);
        
        // Fallback: Delete data manually
        await Promise.all([
          supabase.from('lend_borrow').delete().eq('user_id', user.id),
          supabase.from('budgets').delete().eq('user_id', user.id),
          supabase.from('expenses').delete().eq('user_id', user.id),
          supabase.from('incomes').delete().eq('user_id', user.id),
          supabase.from('profiles').delete().eq('id', user.id),
        ]);
      }

      showSuccess('Account and all data deleted successfully');

      // Sign out and redirect
      await supabase.auth.signOut();
      setTimeout(() => {
        navigate('/login');
      }, 500);
    } catch (error: unknown) {
      console.error('Error deleting account:', error);
      showError('Failed to delete account. Please contact support.');
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card className="border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Permanently delete your account and all associated data including:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>All income and expense records</li>
              <li>Budget information</li>
              <li>Lend and borrow transactions</li>
              <li>Profile and account settings</li>
            </ul>
            <p className="text-sm font-semibold text-red-600 dark:text-red-400">
              ⚠️ This action cannot be undone!
            </p>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account & All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                This will <strong>permanently delete</strong> your account and{' '}
                <strong>all your financial data</strong>.
              </p>
              <p className="text-red-600 dark:text-red-400 font-semibold">
                This action cannot be undone. All your data will be lost forever.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Yes, Delete Everything
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
