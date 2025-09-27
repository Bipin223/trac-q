import { useState, useEffect, useRef } from 'react';
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
import { Loader2, User, Mail, Save, Upload, XCircle, FolderOpen, Image as ImageIcon } from 'lucide-react';
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
  const [showFileManager, setShowFileManager] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [resizeMode, setResizeMode] = useState<'crop' | 'fit'>('crop');
  const [resizeSize, setResizeSize] = useState(300); // Target size for square avatar
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      username: '',
      email: '',
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
      setAvatarPreview(profile.avatar_url || '/logo.png');
    }
  }, [profile, form]);

  const fetchFiles = async () => {
    if (!user) return;
    
    setLoadingFiles(true);
    try {
      const { data, error } = await supabase.storage
        .from('avatars')
        .list(user.id, {
          limit: 20,
          offset: 0,
        });

      if (error) throw error;
      
      setFiles(data || []);
    } catch (error: any) {
      console.error('Error fetching files:', error);
      showError('Failed to load files.');
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileManagerClick = async () => {
    if (!user) return;
    
    setShowFileManager(true);
    await fetchFiles();
  };

  const handleFileSelect = async (fileName: string) => {
    if (!user) return;
    
    try {
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(`${user.id}/${fileName}`);

      const { data: updatedProfileData, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)
        .select()
        .single();

      if (updateError) throw updateError;

      if (updatedProfileData) {
        setProfile(updatedProfileData);
        setAvatarPreview(publicUrl);
        setShowFileManager(false);
        showSuccess('Profile picture updated successfully!');
      }
    } catch (error: any) {
      console.error('Error selecting file:', error);
      showError('Failed to select file.');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files?.[0]) return;

    const file = event.target.files[0];
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file (PNG, JPG, etc.).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
        setAvatarPreview(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const resizeAndUploadImage = async () => {
    if (!avatarPreview || !user || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = resizeSize;
      canvas.height = resizeSize;

      if (resizeMode === 'crop') {
        // Crop to square from center
        const size = Math.min(img.width, img.height);
        const x = (img.width - size) / 2;
        const y = (img.height - size) / 2;
        ctx.drawImage(img, x, y, size, size, 0, 0, resizeSize, resizeSize);
      } else {
        // Fit to square with letterboxing
        const scale = Math.min(resizeSize / img.width, resizeSize / img.height);
        const width = img.width * scale;
        const height = img.height * scale;
        const x = (resizeSize - width) / 2;
        const y = (resizeSize - height) / 2;
        ctx.fillStyle = '#f3f4f6'; // Light gray background
        ctx.fillRect(0, 0, resizeSize, resizeSize);
        ctx.drawImage(img, x, y, width, height);
      }

      canvas.toBlob(async (blob) => {
        if (!blob) return;

        setUploading(true);
        setUploadError(null);

        try {
          const fileExt = 'png'; // Always save as PNG for quality
          const fileName = `${user.id}.${fileExt}`;
          const filePath = `${user.id}/${fileName}`;

          const { data, error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(filePath, blob, { upsert: true });

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(filePath);

          const { data: updatedProfileData, error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: publicUrl })
            .eq('id', user.id)
            .select()
            .single();

          if (updateError) throw updateError;

          if (updatedProfileData) {
            setProfile(updatedProfileData);
            setAvatarPreview(publicUrl);
            showSuccess('Profile picture uploaded successfully!');
            await fetchFiles();
          }
        } catch (error: any) {
          console.error('Avatar upload error:', error);
          setUploadError(error.message || 'Failed to upload profile picture. Please try again.');
        } finally {
          setUploading(false);
        }
      }, 'image/png');
    };
    img.src = avatarPreview;
  };

  const onSubmit = async (values: FormData) => {
    if (!user) return;

    setSaving(true);
    setUploadError(null);

    try {
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

      if (values.email !== user.email) {
        const { error: authError } = await supabase.auth.updateUser({ email: values.email });
        if (authError) throw authError;
      }

      await supabase.auth.refreshSession();
      if (updatedProfile) {
        setProfile(updatedProfile);
      }

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
    return (
      <div className="text-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  const initials = `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || ''}`.toUpperCase();
  const defaultAvatar = '/logo.png';

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
            
            {/* Image Upload Section */}
            <div className="space-y-4 w-full max-w-md">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full"
                onClick={triggerFileInput}
                disabled={uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                Choose Image from Computer
              </Button>
              <Input
                ref={fileInputRef}
                id="avatar-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                onChange={handleImageUpload}
                className="hidden"
              />
              
              {/* Image Preview and Resize Controls */}
              {avatarPreview && avatarPreview !== defaultAvatar && (
                <div className="space-y-4 border rounded-lg p-4 bg-muted/50">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      Original: {imageDimensions.width} × {imageDimensions.height}px
                    </p>
                    <div className="relative mx-auto" style={{ maxWidth: '200px' }}>
                      <img 
                        src={avatarPreview} 
                        alt="Preview" 
                        className="max-w-full h-auto rounded border"
                        style={{ maxHeight: '150px' }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium">Resize Mode</label>
                      <div className="flex gap-2 mt-1">
                        <Button
                          variant={resizeMode === 'crop' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setResizeMode('crop')}
                        >
                          Crop to Square
                        </Button>
                        <Button
                          variant={resizeMode === 'fit' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setResizeMode('fit')}
                        >
                          Fit to Square
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Size: {resizeSize}px</label>
                      <Input
                        type="range"
                        min="100"
                        max="500"
                        value={resizeSize}
                        onChange={(e) => setResizeSize(parseInt(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    
                    <Button
                      onClick={resizeAndUploadImage}
                      disabled={uploading}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Processing & Uploading...
                        </>
                      ) : (
                        'Upload Resized Image'
                      )}
                    </Button>
                  </div>
                </div>
              )}
              
              <p className="text-sm text-muted-foreground text-center">
                Supports JPEG, JPG, PNG (max 5MB). Images will be resized to {resizeSize}px square.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File Manager Modal */}
      {showFileManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">File Manager</h3>
              <Button variant="ghost" onClick={() => setShowFileManager(false)}>
                <XCircle className="h-4 w-4" />
              </Button>
            </div>
            
            {loadingFiles ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : files.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {files.map((file) => (
                  <div 
                    key={file.name}
                    className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    onClick={() => handleFileSelect(file.name)}
                  >
                    <div className="flex flex-col items-center">
                      <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-center truncate w-full">{file.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No files found. Upload some images first!</p>
              </div>
            )}
          </div>
        </div>
      )}

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
      
      {/* Hidden canvas for image processing */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}