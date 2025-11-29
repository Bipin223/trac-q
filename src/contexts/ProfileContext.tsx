import { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
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
  const fetchedUserId = useRef<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (user) {
      // Prevent re-fetching if we already have this user's profile
      if (fetchedUserId.current === user.id && profile) {
        console.log("ProfileContext: Profile already loaded for user:", user.id);
        return;
      }

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
        fetchedUserId.current = null;
      } else if (data) {
        console.log('ProfileContext: Profile data fetched:', data);
        setProfile(data as Profile);
        fetchedUserId.current = user.id;
      } else {
        console.warn('ProfileContext: No profile found for user ID:', user.id);
        setProfile(null);
        fetchedUserId.current = null;
      }
      setLoading(false);
    } else {
      if (profile !== null || fetchedUserId.current !== null) {
        console.log("ProfileContext: No user session, clearing profile.");
        setProfile(null);
        fetchedUserId.current = null;
      }
      setLoading(false);
    }
  }, [user, profile]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    // Force re-fetch by clearing the cached user ID
    fetchedUserId.current = null;
    await fetchProfile();
  }, [fetchProfile]);

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