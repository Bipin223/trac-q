import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

interface ProfileContextType {
  profile: Profile | null;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export const ProfileProvider = ({ children }: { children: ReactNode }) => {
  const user = useUser();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setLoading(true);
        console.log("ProfileContext: User found, fetching profile for ID:", user.id);
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('ProfileContext: Error fetching profile:', error);
          setProfile(null);
        } else if (data) {
          console.log('ProfileContext: Profile data fetched successfully:', data);
          setProfile(data as Profile);
        } else {
          console.warn('ProfileContext: No profile found for user ID:', user.id);
          setProfile(null);
        }
        setLoading(false);
      } else {
        console.log("ProfileContext: No user session found.");
        setProfile(null);
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  return (
    <ProfileContext.Provider value={{ profile, loading }}>
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