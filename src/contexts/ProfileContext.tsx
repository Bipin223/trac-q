import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'user';
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  email?: string;
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
  setProfile: (profile: Profile | null) => void;  // Expose setter for manual updates
  refreshProfile: () => Promise<void>;  // Helper to refetch
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const user = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    if (user) {
      setLoading(true);
      console.log("ProfileContext: Fetching profile for ID:", user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, first_name, last_name, avatar_url, email')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('ProfileContext: Error fetching profile:', error);
        setProfile(null);
      } else if (data) {
        console.log('ProfileContext: Profile data fetched:', data);
        setProfile(data as Profile);
      } else {
        console.warn('ProfileContext: No profile found for user ID:', user.id);
        setProfile(null);
      }
    } else {
      console.log("ProfileContext: No user session.");
      setProfile(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const refreshProfile = async () => {
    await fetchProfile();
  };

  return (
    <ProfileContext.Provider value={{ profile, loading, setProfile, refreshProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};