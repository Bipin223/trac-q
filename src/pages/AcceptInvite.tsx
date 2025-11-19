import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showSuccess, showError } from '@/utils/toast';
import { UserPlus, CheckCircle, XCircle, Loader2 } from 'lucide-react';

export default function AcceptInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [loading, setLoading] = useState(true);
  const [invitation, setInvitation] = useState<any>(null);
  const [inviter, setInviter] = useState<any>(null);
  const [status, setStatus] = useState<'checking' | 'valid' | 'invalid' | 'expired' | 'accepted' | 'error'>('checking');

  useEffect(() => {
    if (token && profile) {
      checkInvitation();
    }
  }, [token, profile]);

  const checkInvitation = async () => {
    if (!token || !profile) return;

    setLoading(true);
    try {
      // Fetch the invitation
      const { data: invitationData, error: invError } = await supabase
        .from('friend_invitations')
        .select('*, inviter:profiles!friend_invitations_inviter_id_fkey(id, full_name, email)')
        .eq('token', token)
        .single();

      if (invError || !invitationData) {
        setStatus('invalid');
        setLoading(false);
        return;
      }

      setInvitation(invitationData);
      setInviter(invitationData.inviter);

      // Check if expired
      const expiresAt = new Date(invitationData.expires_at);
      if (expiresAt < new Date()) {
        setStatus('expired');
        setLoading(false);
        return;
      }

      // Check if max uses reached
      if (invitationData.used_count >= invitationData.max_uses) {
        setStatus('expired');
        setLoading(false);
        return;
      }

      // Check if already friends
      const { data: existingFriendship } = await supabase
        .from('friends')
        .select('*')
        .or(`and(user_id.eq.${profile.id},friend_id.eq.${invitationData.inviter_id}),and(user_id.eq.${invitationData.inviter_id},friend_id.eq.${profile.id})`)
        .single();

      if (existingFriendship) {
        setStatus('accepted');
        setLoading(false);
        return;
      }

      // Can't add yourself
      if (invitationData.inviter_id === profile.id) {
        setStatus('invalid');
        setLoading(false);
        return;
      }

      setStatus('valid');
    } catch (error) {
      console.error('Error checking invitation:', error);
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const acceptInvitation = async () => {
    if (!token || !profile || !invitation) return;

    setLoading(true);
    try {
      // Create friendship (bidirectional)
      const friendshipData = [
        {
          user_id: profile.id,
          friend_id: invitation.inviter_id,
          status: 'accepted',
          requested_by: invitation.inviter_id,
        },
        {
          user_id: invitation.inviter_id,
          friend_id: profile.id,
          status: 'accepted',
          requested_by: invitation.inviter_id,
        },
      ];

      const { error: friendError } = await supabase
        .from('friends')
        .insert(friendshipData);

      if (friendError) {
        showError('Failed to add friend');
        setLoading(false);
        return;
      }

      // Increment used count
      const { error: updateError } = await supabase
        .from('friend_invitations')
        .update({ used_count: invitation.used_count + 1 })
        .eq('id', invitation.id);

      if (updateError) {
        console.error('Error updating invitation:', updateError);
      }

      showSuccess(`You're now friends with ${inviter.full_name}!`);
      setStatus('accepted');
      
      // Redirect to friends page after 2 seconds
      setTimeout(() => {
        navigate('/friends');
      }, 2000);
    } catch (error) {
      console.error('Error accepting invitation:', error);
      showError('An error occurred');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  if (loading && status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Checking invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'invalid') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is not valid or has been deleted.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/friends')}>
              Go to Friends
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired or reached its maximum number of uses.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/friends')}>
              Go to Friends
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle>Already Friends!</CardTitle>
            <CardDescription>
              You're already friends with {inviter?.full_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/friends')}>
              View Friends
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <XCircle className="h-16 w-16 text-destructive" />
            </div>
            <CardTitle>Something Went Wrong</CardTitle>
            <CardDescription>
              An error occurred while processing the invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/friends')}>
              Go to Friends
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <UserPlus className="h-16 w-16 text-primary" />
          </div>
          <CardTitle>Friend Invitation</CardTitle>
          <CardDescription>
            {inviter?.full_name} has invited you to be friends on Trac-Q
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-center">
              <span className="font-semibold">{inviter?.full_name}</span>
              <br />
              <span className="text-muted-foreground">{inviter?.email}</span>
            </p>
          </div>
          <Button 
            onClick={acceptInvitation} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                Accept & Add Friend
              </>
            )}
          </Button>
          <Button 
            onClick={() => navigate('/friends')} 
            variant="outline"
            className="w-full"
          >
            Cancel
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
