import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { 
  Users, 
  UserPlus, 
  QrCode, 
  Link as LinkIcon, 
  Check, 
  X, 
  UserMinus,
  Copy,
  Clock,
  Mail
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import QRCode from 'qrcode';

interface Friend {
  id: string;
  friend_id: string;
  status: string;
  friend_profile: {
    full_name: string;
    email: string;
  };
}

interface FriendRequest {
  id: string;
  user_id: string;
  status: string;
  requested_by: string;
  requester_profile: {
    full_name: string;
    email: string;
  };
}

interface Invitation {
  id: string;
  token: string;
  expires_at: string;
  max_uses: number;
  used_count: number;
  created_at: string;
}

export default function Friends() {
  const { profile } = useProfile();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');

  useEffect(() => {
    if (profile) {
      fetchFriends();
      fetchFriendRequests();
      fetchInvitations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  const fetchFriends = async () => {
    if (!profile) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        friend_id,
        status,
        friend_profile:profiles!friends_friend_id_fkey(full_name, email)
      `)
      .eq('user_id', profile.id)
      .eq('status', 'accepted');

    if (error) {
      console.error('Error fetching friends:', error);
      showError('Failed to load friends');
    } else {
      setFriends(data || []);
    }
    setLoading(false);
  };

  const fetchFriendRequests = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('friends')
      .select(`
        id,
        user_id,
        status,
        requested_by,
        requester_profile:profiles!friends_requested_by_fkey(full_name, email)
      `)
      .eq('friend_id', profile.id)
      .eq('status', 'pending');

    if (error) {
      console.error('Error fetching friend requests:', error);
    } else {
      setFriendRequests(data || []);
    }
  };

  const fetchInvitations = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('friend_invitations')
      .select('*')
      .eq('inviter_id', profile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching invitations:', error);
    } else {
      setInvitations(data || []);
    }
  };

  const generateInvitationLink = async () => {
    if (!profile) return;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const { data: tokenData, error: tokenError } = await supabase
      .rpc('generate_invitation_token');

    if (tokenError) {
      showError('Failed to generate invitation token');
      return;
    }

    const { data, error } = await supabase
      .from('friend_invitations')
      .insert({
        inviter_id: profile.id,
        token: tokenData,
        expires_at: expiresAt.toISOString(),
        max_uses: 10,
        used_count: 0,
      })
      .select()
      .single();

    if (error) {
      showError('Failed to create invitation');
    } else {
      showSuccess('Invitation link created!');
      fetchInvitations();
      const inviteUrl = `${window.location.origin}/accept-invite/${data.token}`;
      await navigator.clipboard.writeText(inviteUrl);
      showSuccess('Invitation link copied to clipboard!');
    }
  };

  const generateQrCode = async (token: string) => {
    const inviteUrl = `${window.location.origin}/accept-invite/${token}`;
    try {
      const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrDataUrl);
      setShowQrDialog(true);
    } catch (error) {
      showError('Failed to generate QR code');
    }
  };

  const copyInviteLink = async (token: string) => {
    const inviteUrl = `${window.location.origin}/accept-invite/${token}`;
    await navigator.clipboard.writeText(inviteUrl);
    showSuccess('Invitation link copied to clipboard!');
  };

  const acceptFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friends')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (error) {
      showError('Failed to accept friend request');
    } else {
      showSuccess('Friend request accepted!');
      fetchFriends();
      fetchFriendRequests();
    }
  };

  const rejectFriendRequest = async (requestId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', requestId);

    if (error) {
      showError('Failed to reject friend request');
    } else {
      showSuccess('Friend request rejected');
      fetchFriendRequests();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('id', friendshipId);

    if (error) {
      showError('Failed to remove friend');
    } else {
      showSuccess('Friend removed');
      fetchFriends();
    }
  };

  const deleteInvitation = async (invitationId: string) => {
    const { error } = await supabase
      .from('friend_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) {
      showError('Failed to delete invitation');
    } else {
      showSuccess('Invitation deleted');
      fetchInvitations();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
          <p className="text-muted-foreground">Manage your friends and send/receive transactions</p>
        </div>
        <Button onClick={generateInvitationLink} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Create Invite Link
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Requests ({friendRequests.length})
          </TabsTrigger>
          <TabsTrigger value="invitations" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            Invitations ({invitations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-6">
          {friends.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No friends yet</p>
                <Button onClick={generateInvitationLink}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Friends
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => (
                <Card key={friend.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{friend.friend_profile.full_name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {friend.friend_profile.email}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Friend</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                          <UserMinus className="h-4 w-4 mr-2" />
                          Remove Friend
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove Friend?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to remove {friend.friend_profile.full_name} from your friends? 
                            You can always add them back later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => removeFriend(friend.id)}>
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-6">
          {friendRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No pending friend requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {friendRequests.map((request) => (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{request.requester_profile.full_name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {request.requester_profile.email}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex gap-2">
                    <Button 
                      onClick={() => acceptFriendRequest(request.id)} 
                      size="sm" 
                      className="flex-1"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Accept
                    </Button>
                    <Button 
                      onClick={() => rejectFriendRequest(request.id)} 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Decline
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="mt-6">
          {invitations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <LinkIcon className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No active invitations</p>
                <Button onClick={generateInvitationLink}>
                  Create Invitation Link
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {invitations.map((invitation) => {
                const expiresAt = new Date(invitation.expires_at);
                const isExpired = expiresAt < new Date();
                const inviteUrl = `${window.location.origin}/accept-invite/${invitation.token}`;

                return (
                  <Card key={invitation.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">Invitation Link</CardTitle>
                          <CardDescription className="mt-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs">Used: {invitation.used_count}/{invitation.max_uses}</span>
                                <span className="text-xs">•</span>
                                <span className={`text-xs ${isExpired ? 'text-destructive' : ''}`}>
                                  {isExpired ? 'Expired' : `Expires ${expiresAt.toLocaleDateString()}`}
                                </span>
                              </div>
                            </div>
                          </CardDescription>
                        </div>
                        {isExpired ? (
                          <Badge variant="destructive">Expired</Badge>
                        ) : (
                          <Badge variant="secondary">Active</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <Input value={inviteUrl} readOnly className="text-sm" />
                          <Button 
                            onClick={() => copyInviteLink(invitation.token)}
                            size="icon"
                            variant="outline"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => generateQrCode(invitation.token)}
                            variant="outline"
                            size="sm"
                            className="flex-1"
                          >
                            <QrCode className="h-4 w-4 mr-2" />
                            Show QR Code
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm">
                                <X className="h-4 w-4 mr-2" />
                                Delete
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Invitation?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete this invitation link. Anyone with this link will no longer be able to use it.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteInvitation(invitation.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation QR Code</DialogTitle>
            <DialogDescription>
              Share this QR code with friends to add them instantly
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            {qrCodeUrl && (
              <img 
                src={qrCodeUrl} 
                alt="Invitation QR Code" 
                className="border-4 border-white shadow-lg rounded-lg"
              />
            )}
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Scan this QR code with a phone camera to accept the invitation
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
