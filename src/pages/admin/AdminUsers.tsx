import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Trash2, Users, Shield, UserCheck, Activity } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Profile {
  id: string;
  username: string;
  email: string;
  role: string;
}

const AdminUsersPage = () => {
  const user = useUser();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminAndFetchUsers = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      // We don't need to check for admin role here, as the RPC function does it for us.
      const { data: usersData, error: usersError } = await supabase
        .rpc('get_all_users_for_admin');
      
      if (usersError) {
        showError('Failed to fetch users. You may not have admin privileges.');
        navigate('/');
      } else {
        setProfiles(usersData as Profile[]);
      }
      setLoading(false);
    };

    checkAdminAndFetchUsers();
  }, [user, navigate]);

  const handleDeleteUser = async (userToDelete: Profile) => {
    if (userToDelete.id === user?.id) {
      showError("You cannot delete your own account from the admin panel.");
      return;
    }
    
    const { error } = await supabase.functions.invoke('delete-user', {
      body: { userId: userToDelete.id },
    });

    if (error) {
      showError(`Failed to delete user: ${error.message}`);
    } else {
      showSuccess(`User "${userToDelete.username}" deleted successfully.`);
      setProfiles(profiles.filter(p => p.id !== userToDelete.id));
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold tracking-tight">Admin Panel - All Users</h1>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  const totalUsers = profiles.length;
  const adminUsers = profiles.filter(p => p.role === 'admin').length;
  const regularUsers = profiles.filter(p => p.role === 'user').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">View and manage all users in the system.</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Registered accounts</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Admin Users</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{adminUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">With admin privileges</p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Regular Users</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{regularUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">Standard accounts</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((profile) => (
                <TableRow key={profile.id} className="hover:bg-purple-50 dark:hover:bg-purple-900/10 transition-colors">
                  <TableCell className="font-medium">{profile.username}</TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'} className="hover:scale-105 transition-transform">
                      {profile.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          disabled={profile.id === user?.id}
                          className="hover:scale-110 transition-all hover:shadow-md"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the user "{profile.username}" and all their associated data. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUser(profile)}>
                            Delete User
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminUsersPage;