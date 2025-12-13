import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import nextDynamic from 'next/dynamic';

// Force dynamic rendering - disable prerendering
export const dynamic = 'force-dynamic';

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
    <div className="max-w-md w-full">
      <Card variant="glow" padding="lg" className="text-center">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin mb-4" />
          <p className="text-[var(--color-text-secondary)]">Загрузка...</p>
        </div>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <Suspense fallback={<LoadingFallback />}>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
