'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * Client component to handle ?ref=CODE query parameter
 * 
 * - Extract referral code from URL
 * - Store in localStorage
 * - After login, claim referral via API
 */
export function ReferralHandler() {
  const searchParams = useSearchParams();
  const [claimed, setClaimed] = useState(false);
  
  useEffect(() => {
    // Extract referral code from URL
    const refCode = searchParams?.get('ref');
    
    if (refCode) {
      // Store in localStorage for later claiming
      localStorage.setItem('pending_referral_code', refCode.toUpperCase());
      console.log('[ReferralHandler] Stored referral code:', refCode);
      
      // Remove from URL to clean up
      const url = new URL(window.location.href);
      url.searchParams.delete('ref');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);
  
  useEffect(() => {
    // Try to claim pending referral after login
    const tryClaimReferral = async () => {
      const pendingCode = localStorage.getItem('pending_referral_code');
      
      if (!pendingCode || claimed) {
        return;
      }
      
      // Check if user is logged in by trying to claim
      try {
        const res = await fetch('/api/referrals/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: pendingCode }),
        });
        
        const data = await res.json();
        
        if (data.success) {
          console.log('[ReferralHandler] Referral claimed successfully');
          localStorage.removeItem('pending_referral_code');
          setClaimed(true);
        } else if (data.alreadyClaimed) {
          console.log('[ReferralHandler] User already has a referrer');
          localStorage.removeItem('pending_referral_code');
          setClaimed(true);
        } else if (res.status === 401) {
          // User not logged in yet, keep code for later
          console.log('[ReferralHandler] User not logged in, will retry after login');
        } else {
          // Invalid code or error
          console.log('[ReferralHandler] Failed to claim referral:', data.message);
          localStorage.removeItem('pending_referral_code');
        }
      } catch (error) {
        console.error('[ReferralHandler] Error claiming referral:', error);
      }
    };
    
    // Try to claim on mount and every 5 seconds (will stop after success)
    const interval = setInterval(tryClaimReferral, 5000);
    tryClaimReferral(); // Try immediately
    
    return () => clearInterval(interval);
  }, [claimed]);
  
  return null; // This component renders nothing
}

