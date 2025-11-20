import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@supabase/auth-helpers-react';
import { useProfile } from '@/contexts/ProfileContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageEditor } from '@/components/ImageEditor';
import { DeleteAccountSection } from '@/components/DeleteAccountSection';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Loader2, User, Mail, Save, Upload, TrendingUp, TrendingDown, DollarSign, Calendar, Trash2, AlertTriangle } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { useNavigate } from 'react-router-dom';

const formSchema = z.object({
  first_name: z.string().min(1, { message: 'First name is required.' }).max(50),
  last_name: z.string().min(1, { message: 'Last name is required.' }).max(50),
  username: z.string().min(3, { message: 'Username must be at least 3 characters.' }).max(20),
  email: z.string().email({ message: 'Invalid email address.' }),
});

type FormData = z.infer<typeof formSchema>;

interface FinancialSummary {
  totalIncome: number;
  totalExpenses: number;
  netSavings: number;
}

export default function ProfileEnhanced() {
  const user = useUser();
  const { profile, loading, setProfile } = useProfile();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [monthlySummary, setMonthlySummary] = useState<FinancialSummary | null>(null);
  const [yearlySummary, setYearlySummary] = useState<FinancialSummary | null>(null);
  const [loadingSummaries, setLoadingSummaries] = useState(true);

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
      fetchFinancialSummaries();
    }
  }, [profile, form]);

  const fetchFinancialSummaries = async () => {
    if (!profile) return;

    setLoadingSummaries(true);
    try {
      const today = new Date();
      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth() + 1;

      // Monthly summary
      const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString();
      const lastDayOfMonth = new Date(currentYear, currentMonth, 0).toISOString();

      const [monthIncomes, monthExpenses] = await Promise.all([
        supabase
          .from('incomes')
          .select('amount')
          .eq('user_id', profile.id)
          .gte('income_date', firstDayOfMonth)
          .lte('income_date', lastDayOfMonth),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', profile.id)
          .gte('expense_date', firstDayOfMonth)
          .lte('expense_date', lastDayOfMonth),
      ]);

      const monthlyIncome = monthIncomes.data?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const monthlyExpenses = monthExpenses.data?.reduce((sum, item) => sum + item.amount, 0) || 0;

      setMonthlySummary({
        totalIncome: monthlyIncome,
        totalExpenses: monthlyExpenses,
        netSavings: monthlyIncome - monthlyExpenses,
      });

      // Yearly summary
      const firstDayOfYear = new Date(currentYear, 0, 1).toISOString();
      const lastDayOfYear = new Date(currentYear, 11, 31).toISOString();

      const [yearIncomes, yearExpenses] = await Promise.all([
        supabase
          .from('incomes')
          .select('amount')
          .eq('user_id', profile.id)
          .gte('income_date', firstDayOfYear)
          .lte('income_date', lastDayOfYear),
        supabase
          .from('expenses')
          .select('amount')
          .eq('user_id', profile.id)
          .gte('expense_date', firstDayOfYear)
          .lte('expense_date', lastDayOfYear),
      ]);

      const yearlyIncome = yearIncomes.data?.reduce((sum, item) => sum + item.amount, 0) || 0;
      const yearlyExpenses = yearExpenses.data?.reduce((sum, item) => sum + item.amount, 0) || 0;

      setYearlySummary({
        totalIncome: yearlyIncome,
        totalExpenses: yearlyExpenses,
        netSavings: yearlyIncome - yearlyExpenses,
      });
    } catch (error) {
      console.error('Error fetching summaries:', error);
      showError('Failed to load financial summaries');
    } finally {
      setLoadingSummaries(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      const errorMsg = `❌ Invalid File Format!\n\nYour file format: ${file.type || 'Unknown'}\n\nPlease select an image in one of these formats:\n• JPEG (.jpg, .jpeg)\n• PNG (.png)\n• GIF (.gif)\n• WebP (.webp)`;
      alert(errorMsg);
      showError(`Invalid file format. Please select JPEG, PNG, GIF, or WebP.`);
      // Reset file input
      event.target.value = '';
      return;
    }

    // Check file size
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    const maxSizeMB = 5;
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      const errorMsg = `❌ File Too Large!\n\nYour file size: ${fileSizeMB} MB\nMaximum allowed: ${maxSizeMB} MB\n\nPlease:\n• Compress your image\n• Choose a smaller image\n• Use an online image compressor`;
      alert(errorMsg);
      showError(`Image is ${fileSizeMB}MB. Maximum size is ${maxSizeMB}MB.`);
      // Reset file input
      event.target.value = '';
      return;
    }

    // File is valid, proceed
    showSuccess(`✓ Valid image selected (${fileSizeMB}MB)`);
    const reader = new FileReader();
    reader.onload = (e) => {
      setSelectedFile(e.target?.result as string);
      setShowImageEditor(true);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveImage = async (blob: Blob) => {
    if (!user) {
      showError('User not authenticated');
      return;
    }

    console.log('Starting image save...', { blobSize: blob.size, blobType: blob.type });
    setUploading(true);
    
    try {
      // Convert blob to base64 data URL
      const reader = new FileReader();
      
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      console.log('Image converted to data URL, length:', dataUrl.length);

      // Update profile in database with data URL
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: dataUrl })
        .eq('id', user.id)
        .select();

      if (updateError) {
        console.error('Database update error:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }

      console.log('Profile updated successfully:', updateData);

      // Update local state
      setProfile({ ...profile!, avatar_url: dataUrl });
      
      showSuccess('Profile picture updated! Refreshing...');
      setShowImageEditor(false);
      setSelectedFile(null);
      
      // Reload page to show new avatar
      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error: any) {
      console.error('Error in handleSaveImage:', error);
      showError(error.message || 'Failed to save image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          username: data.username,
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({
        ...profile!,
        first_name: data.first_name,
        last_name: data.last_name,
        username: data.username,
      });

      showSuccess('Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !profile) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const initials = `${profile.first_name?.charAt(0) || ''}${profile.last_name?.charAt(0) || profile.username?.charAt(0) || ''}`.toUpperCase();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile Settings</h1>
        <p className="text-muted-foreground">Manage your account and view financial summaries</p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Summary</TabsTrigger>
          <TabsTrigger value="yearly">Yearly Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Avatar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-32 w-32 ring-4 ring-purple-200 dark:ring-purple-800">
                  <AvatarImage src={profile.avatar_url} alt="Profile picture" />
                  <AvatarFallback className="text-3xl bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-300">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label htmlFor="avatar-upload">
                    <Button
                      type="button"
                      variant="outline"
                      className="cursor-pointer hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      onClick={() => document.getElementById('avatar-upload')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload New Picture
                    </Button>
                  </label>
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  Supports JPEG, PNG (max 5MB). You can crop, rotate, and choose shape.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Personal Information */}
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
                            <Input className="pl-10" type="email" placeholder="Enter email" {...field} disabled />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="pt-4">
                    <p className="text-sm text-muted-foreground">
                      <strong>Role:</strong> {profile.role}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-3">
                <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700" disabled={saving}>
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
              </div>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-6">
          {loadingSummaries ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : monthlySummary ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    This Month's Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Income</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        NPR {monthlySummary.totalIncome.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-6 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        NPR {monthlySummary.totalExpenses.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-2">
                        <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Net Savings</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        NPR {monthlySummary.netSavings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No data available for this month
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="yearly" className="space-y-6">
          {loadingSummaries ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : yearlySummary ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    This Year's Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Total Income</p>
                      <p className="text-2xl font-bold text-green-700 dark:text-green-300">
                        NPR {yearlySummary.totalIncome.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-6 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800">
                      <div className="flex items-center justify-between mb-2">
                        <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
                      </div>
                      <p className="text-sm font-medium text-red-600 dark:text-red-400">Total Expenses</p>
                      <p className="text-2xl font-bold text-red-700 dark:text-red-300">
                        NPR {yearlySummary.totalExpenses.toLocaleString()}
                      </p>
                    </div>

                    <div className="p-6 rounded-xl bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-2">
                        <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      </div>
                      <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Net Savings</p>
                      <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                        NPR {yearlySummary.netSavings.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No data available for this year
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Delete Account Section */}
      <DeleteAccountSection />

      {/* Image Editor Dialog */}
      <Dialog open={showImageEditor} onOpenChange={setShowImageEditor}>
        <DialogContent className="max-w-3xl" onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Edit Profile Picture</DialogTitle>
          </DialogHeader>
          {selectedFile && (
            <ImageEditor
              imageUrl={selectedFile}
              onSave={handleSaveImage}
              onCancel={() => {
                setShowImageEditor(false);
                setSelectedFile(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
