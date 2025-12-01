import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import { MoneyRequestDialog } from '@/components/MoneyRequestDialog';
import { 
  Users, 
  UserPlus, 
  QrCode, 
  Check, 
  X, 
  UserMinus,
  Copy,
  Clock,
  Mail,
  Hash,
  Camera,
  Upload,
  DollarSign,
  HandCoins
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
import { Html5Qrcode } from 'html5-qrcode';

interface Friend {
  id: string;
  friend_id: string;
  status: string;
  friend_profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface FriendRequest {
  id: string;
  user_id: string;
  status: string;
  requested_by: string;
  requester_profile: {
    first_name: string;
    last_name: string;
    email: string;
  };
}

export default function Friends() {
  const { profile } = useProfile();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showQrDialog, setShowQrDialog] = useState(false);
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [activeTab, setActiveTab] = useState('friends');
  const [friendCodeInput, setFriendCodeInput] = useState('');
  const [userFriendCode, setUserFriendCode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [showMoneyRequestDialog, setShowMoneyRequestDialog] = useState(false);
  const [selectedFriendForRequest, setSelectedFriendForRequest] = useState<string | undefined>();
  const [moneyRequestType, setMoneyRequestType] = useState<'request_money' | 'send_money'>('request_money');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      fetchFriends();
      fetchFriendRequests();
      fetchUserFriendCode();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // Auto-switch to Requests tab if there are pending requests
  useEffect(() => {
    if (friendRequests.length > 0 && activeTab === 'friends') {
      setActiveTab('requests');
    }
  }, [friendRequests.length]);

  useEffect(() => {
    // Cleanup scanner on unmount
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const fetchUserFriendCode = async () => {
    if (!profile) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('friend_code')
      .eq('id', profile.id)
      .single();
    
    if (!error && data) {
      setUserFriendCode(data.friend_code || '');
    }
  };

  const fetchFriends = async () => {
    if (!profile) return;
    setLoading(true);
    
    console.log('🔍 Fetching friends for user:', profile.id);
    
    // First, get the friends list
    const { data: friendsData, error: friendsError } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, status, created_at')
      .eq('user_id', profile.id)
      .eq('status', 'accepted')
      .order('created_at', { ascending: false });

    if (friendsError) {
      console.error('❌ Error fetching friends:', friendsError);
      showError('Failed to load friends');
      setLoading(false);
      return;
    }

    if (!friendsData || friendsData.length === 0) {
      console.log('✅ No friends found');
      setFriends([]);
      setLoading(false);
      return;
    }

    // Get all friend IDs
    const friendIds = friendsData.map(f => f.friend_id);
    
    // Fetch profiles for all friends
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, friend_code')
      .in('id', friendIds);

    if (profilesError) {
      console.error('❌ Error fetching friend profiles:', profilesError);
      showError('Failed to load friend profiles');
      setLoading(false);
      return;
    }

    // Combine the data
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    const combinedFriends = friendsData.map(friend => ({
      ...friend,
      friend_profile: profilesMap.get(friend.friend_id) || { 
        first_name: '', 
        last_name: '', 
        email: 'Unknown',
        friend_code: ''
      }
    }));

    console.log('✅ Friends loaded:', combinedFriends.length);
    setFriends(combinedFriends);
    setLoading(false);
  };

  const fetchFriendRequests = async () => {
    if (!profile) return;

    console.log('🔍 Fetching friend requests for user:', profile.id);

    // First, get the friend requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('friends')
      .select('id, user_id, friend_id, status, requested_by, created_at')
      .eq('user_id', profile.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('❌ Error fetching friend requests:', requestsError);
      setFriendRequests([]);
      return;
    }

    if (!requestsData || requestsData.length === 0) {
      console.log('✅ No pending requests');
      setFriendRequests([]);
      return;
    }

    // Get all requester IDs
    const requesterIds = requestsData.map(r => r.requested_by);
    
    // Fetch profiles for all requesters
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email, friend_code')
      .in('id', requesterIds);

    if (profilesError) {
      console.error('❌ Error fetching requester profiles:', profilesError);
      setFriendRequests([]);
      return;
    }

    // Combine the data
    const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    const combinedRequests = requestsData.map(request => ({
      ...request,
      requester_profile: profilesMap.get(request.requested_by) || { 
        first_name: '', 
        last_name: '', 
        email: 'Unknown',
        friend_code: ''
      }
    }));

    console.log('✅ Friend requests loaded:', combinedRequests.length);
    setFriendRequests(combinedRequests);
  };

  const generateMyQrCode = async () => {
    if (!userFriendCode) {
      showError('Friend code not available');
      return;
    }

    try {
      const qrDataUrl = await QRCode.toDataURL(userFriendCode, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setQrCodeUrl(qrDataUrl);
      setShowQrDialog(true);
    } catch (error) {
      console.error('QR generation error:', error);
      showError('Failed to generate QR code');
    }
  };

  const startScanning = async () => {
    try {
      setScanError('');
      setIsScanning(true);

      // Check if camera is available
      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setScanError('No camera found. Please upload a QR code image instead.');
        setIsScanning(false);
        return;
      }

      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Successfully scanned
          handleScannedCode(decodedText);
          stopScanning();
        },
        (errorMessage) => {
          // Scanning error (can be ignored as it happens frequently)
          console.debug('Scan error:', errorMessage);
        }
      );
    } catch (error) {
      console.error('Scanner start error:', error);
      setScanError('Failed to start camera. Please check permissions or upload an image instead.');
      setIsScanning(false);
    }
  };

  const stopScanning = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current = null;
      } catch (error) {
        console.error('Error stopping scanner:', error);
      }
    }
    setIsScanning(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode('qr-reader-file');
      const result = await scanner.scanFile(file, true);
      handleScannedCode(result);
    } catch (error) {
      console.error('File scan error:', error);
      showError('Failed to read QR code from image');
    }
  };

  const handleScannedCode = (code: string) => {
    // Close the scan dialog
    setShowScanDialog(false);
    stopScanning();

    // Auto-fill the friend code input
    setFriendCodeInput(code);
    showSuccess('QR code scanned! Click "Send Request" to add friend.');
  };

  const acceptFriendRequest = async (requestId: string) => {
    console.log('✅ Accepting friend request:', requestId);
    
    const { data, error } = await supabase
      .from('friends')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .select();

    console.log('Accept result:', data);
    console.log('Accept error:', error);

    if (error) {
      console.error('❌ Failed to accept:', error);
      showError('Failed to accept friend request');
    } else {
      showSuccess('Friend request accepted! You are now friends.');
      // Refresh both lists after a short delay to allow trigger to complete
      setTimeout(() => {
        fetchFriends();
        fetchFriendRequests();
      }, 500);
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

  const addFriendByCode = async () => {
    if (!profile || !friendCodeInput.trim()) {
      showError('Please enter a friend code');
      return;
    }

    console.log('🔍 Starting friend request process...');
    console.log('Current user ID:', profile.id);
    console.log('Input code:', friendCodeInput);

    // Normalize the input (add #TRAC- if missing, convert to uppercase)
    let normalizedCode = friendCodeInput.trim().toUpperCase();
    
    // Handle various input formats
    if (!normalizedCode.startsWith('#')) {
      // If input is just alphanumeric, add #TRAC-
      if (!normalizedCode.startsWith('TRAC-')) {
        normalizedCode = '#TRAC-' + normalizedCode;
      } else {
        // If starts with TRAC- but no #, add #
        normalizedCode = '#' + normalizedCode;
      }
    } else if (normalizedCode === '#' || normalizedCode.length < 8) {
      showError('Please enter a valid friend code');
      return;
    }

    console.log('Normalized code:', normalizedCode);

    // Check if trying to add yourself
    if (normalizedCode === userFriendCode) {
      showError("You can't add yourself as a friend!");
      return;
    }

    // Find user with this friend code
    console.log('🔍 Looking up user with friend code...');
    const { data: targetUser, error: findError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('friend_code', normalizedCode)
      .maybeSingle();

    console.log('Target user result:', targetUser);
    console.log('Find error:', findError);

    if (findError) {
      console.error('❌ Error finding user:', findError);
      showError(`Database error: ${findError.message}`);
      return;
    }

    if (!targetUser) {
      showError('Friend code not found. Please check and try again.');
      return;
    }

    const targetUserName = targetUser.first_name && targetUser.last_name 
      ? `${targetUser.first_name} ${targetUser.last_name}` 
      : targetUser.email;
    console.log('✅ Found target user:', targetUserName);

    // Check if already friends or request exists
    console.log('🔍 Checking for existing friendship...');
    const { data: existingFriends, error: checkError } = await supabase
      .from('friends')
      .select('id, status, user_id, friend_id, requested_by')
      .or(`and(user_id.eq.${profile.id},friend_id.eq.${targetUser.id}),and(user_id.eq.${targetUser.id},friend_id.eq.${profile.id})`);

    console.log('Existing friendships:', existingFriends);
    console.log('Check error:', checkError);

    if (checkError) {
      console.error('❌ Error checking existing friendship:', checkError);
    }

    if (existingFriends && existingFriends.length > 0) {
      const existing = existingFriends[0];
      if (existing.status === 'accepted') {
        showError('You are already friends with this user!');
      } else {
        showError('Friend request already pending!');
      }
      return;
    }

    // Create friend request
    // Important: user_id is the RECIPIENT, friend_id is the SENDER, requested_by is the SENDER
    const friendRequestData = {
      user_id: targetUser.id,      // recipient
      friend_id: profile.id,        // sender (you)
      status: 'pending',
      requested_by: profile.id,     // who initiated the request (you)
      method: 'friend_code'
    };

    console.log('📤 Sending friend request with data:', friendRequestData);

    const { data: insertedData, error: insertError } = await supabase
      .from('friends')
      .insert(friendRequestData)
      .select();

    console.log('Insert result:', insertedData);
    console.log('Insert error:', insertError);

    if (insertError) {
      console.error('❌ Failed to send friend request:', insertError);
      showError(`Failed to send friend request: ${insertError.message}`);
      
      // Provide helpful error messages
      if (insertError.message.includes('policies')) {
        showError('Permission error. Please run the FRIENDS_SYSTEM_FIX.sql script in Supabase.');
      }
    } else {
      console.log('✅ Friend request sent successfully!');
      showSuccess(`Friend request sent to ${targetUserName}!`);
      setFriendCodeInput('');
      fetchFriends();
    }
  };

  const copyFriendCode = async () => {
    if (userFriendCode) {
      await navigator.clipboard.writeText(userFriendCode);
      showSuccess('Your friend code copied to clipboard!');
    }
  };

  const handleCloseScanDialog = () => {
    stopScanning();
    setShowScanDialog(false);
    setScanError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Friends</h1>
          <p className="text-muted-foreground">Manage your friends and send/receive transactions</p>
        </div>
        {friendRequests.length > 0 && (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            {friendRequests.length} Pending Request{friendRequests.length > 1 ? 's' : ''}
          </Badge>
        )}
      </div>

      {/* Your Friend Code Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Your Friend Code
          </CardTitle>
          <CardDescription>Share this code with friends to connect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-background rounded-lg p-4 border-2 border-dashed border-primary/30">
              <p className="text-2xl font-bold text-center tracking-wider font-mono text-primary">
                {userFriendCode || 'Loading...'}
              </p>
            </div>
            <Button
              onClick={copyFriendCode}
              variant="outline"
              size="icon"
              className="h-12 w-12"
              disabled={!userFriendCode}
            >
              <Copy className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Friends can use this code to send you a friend request
          </p>
        </CardContent>
      </Card>

      {/* QR Code Section - Generate or Scan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Code
          </CardTitle>
          <CardDescription>Generate your QR code or scan a friend's code</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={generateMyQrCode} 
              disabled={!userFriendCode}
              className="w-full"
              variant="default"
            >
              <QrCode className="h-4 w-4 mr-2" />
              Generate QR
            </Button>
            <Button 
              onClick={() => setShowScanDialog(true)}
              className="w-full"
              variant="outline"
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan QR
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Add Friend by Code Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Add Friend by Code
          </CardTitle>
          <CardDescription>Enter a friend's code to send them a request</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Enter friend code"
                value={friendCodeInput}
                onChange={(e) => setFriendCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addFriendByCode()}
                className="font-mono"
              />
            </div>
            <Button onClick={addFriendByCode} disabled={!friendCodeInput.trim()}>
              <UserPlus className="h-4 w-4 mr-2" />
              Send Request
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Friends ({friends.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2 relative">
            <Clock className="h-4 w-4" />
            Requests ({friendRequests.length})
            {friendRequests.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 rounded-full p-0 flex items-center justify-center text-xs">
                {friendRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="mt-6">
          {friends.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No friends yet</p>
                <p className="text-sm text-muted-foreground">Share your friend code or scan a QR code to connect</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => {
                const friendName = friend.friend_profile.first_name && friend.friend_profile.last_name
                  ? `${friend.friend_profile.first_name} ${friend.friend_profile.last_name}`
                  : friend.friend_profile.email;
                return (
                <Card key={friend.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{friendName}</CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <Mail className="h-3 w-3" />
                          {friend.friend_profile.email}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary">Friend</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedFriendForRequest(friend.friend_id);
                          setMoneyRequestType('request_money');
                          setShowMoneyRequestDialog(true);
                        }}
                      >
                        <HandCoins className="h-4 w-4 mr-2" />
                        Request Money
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedFriendForRequest(friend.friend_id);
                          setMoneyRequestType('send_money');
                          setShowMoneyRequestDialog(true);
                        }}
                      >
                        <DollarSign className="h-4 w-4 mr-2" />
                        Send Money
                      </Button>
                    </div>
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
                            Are you sure you want to remove {friendName} from your friends? 
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
              )})}
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
              {friendRequests.map((request) => {
                const requesterName = request.requester_profile.first_name && request.requester_profile.last_name
                  ? `${request.requester_profile.first_name} ${request.requester_profile.last_name}`
                  : request.requester_profile.email;
                return (
                <Card key={request.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{requesterName}</CardTitle>
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
              )})}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* QR Code Display Dialog */}
      <Dialog open={showQrDialog} onOpenChange={setShowQrDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Your Friend Code QR</DialogTitle>
            <DialogDescription>
              Share this QR code with friends to add you instantly
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center py-6">
            {qrCodeUrl && (
              <div className="bg-white p-4 rounded-lg">
                <img 
                  src={qrCodeUrl} 
                  alt="Friend Code QR" 
                  className="w-full max-w-sm"
                />
              </div>
            )}
            <div className="mt-4 text-center space-y-2">
              <p className="text-lg font-mono font-bold text-primary">{userFriendCode}</p>
              <p className="text-sm text-muted-foreground">
                Scan this QR code with the Trac-Q app to add me as a friend
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Scanner Dialog */}
      <Dialog open={showScanDialog} onOpenChange={handleCloseScanDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan Friend Code QR</DialogTitle>
            <DialogDescription>
              Use your camera to scan a friend's QR code or upload an image
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!isScanning && (
              <div className="flex gap-2">
                <Button onClick={startScanning} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera
                </Button>
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            )}

            {scanError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {scanError}
              </div>
            )}

            <div className="relative">
              {isScanning && (
                <div className="absolute top-2 right-2 z-10">
                  <Button onClick={stopScanning} variant="destructive" size="sm">
                    Stop Camera
                  </Button>
                </div>
              )}
              <div 
                id="qr-reader" 
                className="w-full rounded-lg overflow-hidden bg-black"
              />
              <div id="qr-reader-file" className="hidden" />
            </div>

            <p className="text-xs text-muted-foreground text-center">
              Position the QR code within the frame to scan automatically
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Money Request Dialog */}
      <MoneyRequestDialog
        open={showMoneyRequestDialog}
        onOpenChange={setShowMoneyRequestDialog}
        friends={friends}
        onSuccess={() => {
          showSuccess('Request sent successfully!');
          setSelectedFriendForRequest(undefined);
        }}
        defaultFriendId={selectedFriendForRequest}
        defaultType={moneyRequestType}
      />
    </div>
  );
}
