'use client';

import Link from 'next/link';
import { ReferralInvite } from '@/components/home/referral-invite';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ReferralsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] pt-20 pb-12">
      <div className="container mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mb-6">
          <Button asChild variant="ghost" className="text-[var(--muted)] hover:text-[var(--text)]">
            <Link href="/profile" className="gap-2 inline-flex items-center">
              <ArrowLeft className="w-4 h-4" />
              Назад в профиль
            </Link>
          </Button>
        </div>

        <ReferralInvite />
      </div>
    </div>
  );
}


