'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OverviewStats {
  overview: {
    totalCodes: number;
    totalAttributions: number;
    totalEvents: number;
    totalStarsRewarded: number;
    eventsByType: Record<string, number>;
    topReferrers: Array<{
      userId: string;
      displayName: string;
      referralsCount: number;
    }>;
  };
  affiliate: {
    totalApplications: number;
    pendingApplications: number;
    approvedAffiliates: number;
  };
}

export default function AdminReferralsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/referrals/overview', { credentials: 'include' });
      
      if (res.status === 401 || res.status === 403) {
        router.push('/');
        return;
      }
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setStats(data);
    } catch (err) {
      setError('Failed to fetch stats');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Реферальная система</h1>
        <div className="text-[var(--muted)]">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Реферальная система</h1>
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Реферальная система</h1>

        {/* Referral Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Статистика рефералов</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-sm text-[var(--muted)] mb-1">Всего кодов</div>
              <div className="text-3xl font-bold">{stats.overview.totalCodes}</div>
            </div>
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-sm text-[var(--muted)] mb-1">Активировано</div>
              <div className="text-3xl font-bold">{stats.overview.totalAttributions}</div>
            </div>
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-sm text-[var(--muted)] mb-1">Событий</div>
              <div className="text-3xl font-bold">{stats.overview.totalEvents}</div>
            </div>
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-sm text-[var(--muted)] mb-1">Начислено ⭐</div>
              <div className="text-3xl font-bold">{stats.overview.totalStarsRewarded}</div>
            </div>
          </div>
        </div>

        {/* Events by Type */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">События по типам</h2>
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            {Object.entries(stats.overview.eventsByType).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.overview.eventsByType).map(([type, count]) => (
                  <div key={type} className="flex justify-between items-center">
                    <div className="font-medium">{type}</div>
                    <div className="text-[var(--muted)]">{count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[var(--muted)]">Нет событий</div>
            )}
          </div>
        </div>

        {/* Top Referrers */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Топ рефереров</h2>
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            {stats.overview.topReferrers.length > 0 ? (
              <div className="space-y-3">
                {stats.overview.topReferrers.map((referrer, idx) => (
                  <div key={referrer.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--gold)]/20 flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-medium">{referrer.displayName}</div>
                        <div className="text-xs text-[var(--muted)]">{referrer.userId}</div>
                      </div>
                    </div>
                    <div className="text-[var(--gold)] font-semibold">
                      {referrer.referralsCount} реф.
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[var(--muted)]">Нет данных</div>
            )}
          </div>
        </div>

        {/* Affiliate Stats */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Партнёрская программа</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-sm text-[var(--muted)] mb-1">Всего заявок</div>
              <div className="text-3xl font-bold">{stats.affiliate.totalApplications}</div>
            </div>
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-sm text-[var(--muted)] mb-1">На рассмотрении</div>
              <div className="text-3xl font-bold">{stats.affiliate.pendingApplications}</div>
            </div>
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="text-sm text-[var(--muted)] mb-1">Одобрено</div>
              <div className="text-3xl font-bold">{stats.affiliate.approvedAffiliates}</div>
            </div>
          </div>
          <div className="mt-4">
            <button
              onClick={() => router.push('/admin/partners')}
              className="px-6 py-3 rounded-xl bg-[var(--gold)] text-black font-medium hover:opacity-90 transition"
            >
              Управление партнёрами →
            </button>
          </div>
        </div>
    </div>
  );
}

