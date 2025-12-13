'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/auth-provider';
import { getProfile, type Profile } from '@/lib/supabase/database';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const data = await getProfile(user.id);
      setProfile(data);
      setLoading(false);
    }

    fetchProfile();
  }, [user]);

  const refetch = async () => {
    if (!user) return;
    const data = await getProfile(user.id);
    setProfile(data);
  };

  return {
    profile,
    loading,
    credits: profile?.credits ?? 0,
    plan: profile?.plan ?? 'free',
    refetch,
  };
}

