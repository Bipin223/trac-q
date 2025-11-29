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
  setProfile: (profile: Profile | null) => void;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const user = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchedUserId = useRef<string | null>(null);
  const isCreatingProfile = useRef(false);

  const fetchProfile = useCallback(async (forceRefresh: boolean = false) => {
    if (!user) {
      console.log("ProfileContext: No user session, clearing profile.");
      setProfile(null);
      fetchedUserId.current = null;
      setLoading(false);
      return;
    }

    // Prevent duplicate fetches for same user
    if (!forceRefresh && fetchedUserId.current === user.id) {
      console.log("ProfileContext: Profile already loaded for user:", user.id);
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous profile creation attempts
    if (isCreatingProfile.current) {
      console.log("ProfileContext: Profile creation already in progress");
      return;
    }

    setLoading(true);
    console.log("ProfileContext: Fetching profile for ID:", user.id);
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, role, first_name, last_name, avatar_url, email')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('ProfileContext: Error fetching profile:', error);
        setProfile(null);
        fetchedUserId.current = null;
      } else if (data && data.id) {
        console.log('ProfileContext: Profile found:', data.username);
        setProfile(data as Profile);
        fetchedUserId.current = user.id;
      } else {
        console.warn('ProfileContext: No profile found for user ID:', user.id);
        
        // Single retry after 1.5 seconds (trigger might be slow)
        console.log('ProfileContext: Waiting for trigger to create profile...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const { data: retryData } = await supabase
          .from('profiles')
          .select('id, username, role, first_name, last_name, avatar_url, email')
          .eq('id', user.id)
          .maybeSingle();
        
        if (retryData && retryData.id) {
          console.log('ProfileContext: Profile found on retry:', retryData.username);
          setProfile(retryData as Profile);
          fetchedUserId.current = user.id;
        } else {
          // Profile still doesn't exist - create it manually as last resort
          console.error('ProfileContext: Trigger failed, creating profile manually');
          isCreatingProfile.current = true;
          
          try {
            const username = user.email?.split('@')[0] || 'user' + Math.floor(Math.random() * 10000);
            
            const { data: createdProfile, error: createError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                username: username,
                email: user.email,
                role: 'user'
              })
              .select('id, username, role, first_name, last_name, avatar_url, email')
              .single();

            if (createError) {
              console.error('ProfileContext: Manual profile creation failed:', createError);
              setProfile(null);
              fetchedUserId.current = null;
            } else if (createdProfile) {
              console.log('ProfileContext: Profile created manually:', createdProfile.username);
              setProfile(createdProfile as Profile);
              fetchedUserId.current = user.id;
            }
          } catch (createErr) {
            console.error('ProfileContext: Exception during manual creation:', createErr);
            setProfile(null);
            fetchedUserId.current = null;
          } finally {
            isCreatingProfile.current = false;
          }
        }
      }
    } catch (err) {
      console.error('ProfileContext: Exception while fetching profile:', err);
      setProfile(null);
      fetchedUserId.current = null;
    }
    
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchProfile(false);
  }, [user?.id]); // Only depend on user.id, not the entire user object

  const refreshProfile = useCallback(async () => {
    fetchedUserId.current = null;
    await fetchProfile(true);
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