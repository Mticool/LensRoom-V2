import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import nextDynamic from 'next/dynamic';

// Force dynamic rendering - disable prerendering
export const dynamic = 'force-dynamic';
export const runtime = 'edge';

// Dynamically import the content component with no SSR
const PaymentSuccessContent = nextDynamic(
  () => import('./PaymentSuccessContent'),
  { 
    ssr: false,
    loading: () => <LoadingFallback />
  }
);

function LoadingFallback() {
  return (
    <div className="max-w-2xl w-full">
      <Card variant="glow" className="text-center">
        <div className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-12 h-12 text-purple-500 animate-spin mb-4" />
            <p className="text-[var(--color-text-secondary)]">Загрузка...</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-6">
      <Suspense fallback={<LoadingFallback />}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
