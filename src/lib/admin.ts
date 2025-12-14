'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// List of admin email addresses
const ADMIN_EMAILS = [
  'admin@lensroom.ru',
  'marat@lensroom.ru',
  'mti2324@gmail.com',
];

/**
 * Check if a user is an admin by their user ID
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  try {
    const supabase = createClient();
    
    // Get user email
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user || user.id !== userId) {
      return false;
    }

    // Check if email is in admin list
    if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) {
      return true;
    }

    // Optionally, check admin flag in database
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    return profile?.is_admin === true;
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}

/**
 * Check if current user is admin (client-side)
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return false;
    
    return checkIsAdmin(user.id);
  } catch {
    return false;
  }
}

/**
 * Admin-only wrapper for server actions
 */
export function requireAdmin<T extends (...args: unknown[]) => Promise<unknown>>(
  action: T
): T {
  return (async (...args: Parameters<T>) => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Unauthorized');
    }

    const isAdmin = await checkIsAdmin(user.id);
    if (!isAdmin) {
      throw new Error('Forbidden: Admin access required');
    }

    return action(...args);
  }) as T;
}

/**
 * React hook to check if current user is admin
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const result = await isCurrentUserAdmin();
        setIsAdmin(result);
      } catch {
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  return { isAdmin, loading };
}
