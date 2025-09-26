import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, User, Mail, Save, Upload, XCircle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

const formSchema = z.object({
  first_name: z.string().min(1, { message: 'First name is required.' }).max(50),
  last_name: z.string().min(1, { message: 'Last name is required.' }).max(50),
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }).max(20),
  email: z.string().email({ message: 'Invalid email address.' }),
});

type FormData = z.infer<typeof formSchema>;

export default function Profile() {
  const user = useUser();
  const { profile, loading, setProfile } = useProfile();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      username: profile?.username || '',
      email: profile?.email || '',
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        username: profile.username || '',
        email: profile.email || '',
      });
      // Default to Zoro avatar if no custom
      setAvatarPreview(profile.avatar_url || 'https://i.imgur.com/abc123zoro.png');  // Replace with actual Zoro URL
    }
  }, [profile, form]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    // Validation: File type and size (<5MB)
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (PNG, JPG, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB.');
      return;
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    setUploading(true);
    setUploadError(null);

    try {
      // Preview locally first
      const reader = new FileReader();
      reader.onload = (e) => setAvatarPreview(e.target?.result as string);
      reader.readAsDataURL(file);

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profiles table and get updated profile
      const { data: updatedProfileData, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select()  // Select to get updated row
        .single();

      if (updateError) throw updateError;

      // Refresh profile in context (no full reload)
      if (updatedProfileData) setProfile(updatedProfileData);

      showSuccess('Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setUploadError(error.message || 'Failed to upload profile picture. Please try again.');
      // Revert preview on error
      setAvatarPreview(profile?.avatar_url || 'https://i.imgur.com/abc123zoro.png');
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const onSubmit = async (values: FormData) => {
    if (!user) return;

    setSaving(true);
    setUploadError(null);

    try {
      // Check username uniqueness (exclude current user)
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', values.username)
        .neq('id', user.id)
        .single();

      if (existingUser) {
        showError('Username is already taken. Please choose another.');
        return;
      }

      // Update profiles table
      const { data: updatedProfile, error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: values.first_name,
          last_name: values.last_name,
          username: values.username,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id)
        .select()
        .single();

      if (profileError) throw profileError;

      // Update email in auth.users if changed
      if (values.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: values.email });
        if (authError) throw authError;
      }

      // Refresh session and profile
      await supabase.auth.refreshSession();
      if (updatedProfile) setProfile(updatedProfile);

      showSuccess('Profile updated successfully!');
    } catch (error: any) {
      console.error('Profile update error:', error);
      showError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return <div className="text-center text-muted-foreground">Loading profile...</div>;
  }

  const initials = `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`.toUpperCase();
  const defaultAvatar = 'https://i.imgur.com/abc123zoro.png';  // Zoro default

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Profile Picture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="h-32 w-32">
              <AvatarImage src={avatarPreview || defaultAvatar} alt="Profile picture" />
              <AvatarFallback className="h-32 w-32 text-2xl">{initials}</AvatarFallback>
            </Avatar>
            {uploadError && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <XCircle className="h-4 w-4" />
                {uploadError}
              </div>
            )}
            <div className="space-y-2">
              <label htmlFor="avatar-upload" className="cursor-pointer">
                <Button type="button" variant="outline" disabled={uploading}>
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {uploading ? 'Uploading...' : 'Upload New Picture'}
                </Button>
              </label>
              <Input
                id="avatar-upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground text-center">
                Choose a square image (PNG/JPG, <5MB). Current: {avatarPreview ? 'Custom' : 'Zoro (One Piece) Default'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="first_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter first name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="last_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="Enter username" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input className="pl-10" type="email" placeholder="Enter email" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-4">
                <p className="text-sm text-muted-foreground">
                  <strong>Role:</strong> {profile.role} (Admin users have extra permissions.)
                </p>
              </div>
            </CardContent>
          </Card>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}