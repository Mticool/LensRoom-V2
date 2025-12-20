'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Earning {
  id: string;
  affiliate_user_id: string;
  referral_user_id: string;
  payment_id: string;
  amount_rub: number;
  commission_percent: number;
  commission_rub: number;
  tariff_name: string;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  affiliate?: {
    display_name: string;
    username: string;
  };
  referral?: {
    display_name: string;
    username: string;
  };
}

interface Summary {
  affiliate_user_id: string;
  display_name: string;
  username: string;
  tier: string;
  percent: number;
  total_referrals: number;
  total_sales_rub: number;
  total_commission_rub: number;
  pending_rub: number;
  paid_rub: number;
  last_sale_at: string;
}

export default function AffiliateEarningsPage() {
  const router = useRouter();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [selectedAffiliate, setSelectedAffiliate] = useState<string | null>(null);

  useEffect(() => {
    fetchEarnings();
  }, [filter, selectedAffiliate]);

  const fetchEarnings = async () => {
    try {
      setLoading(true);
      let url = '/api/admin/affiliate/earnings';
      const params = new URLSearchParams();
      
      if (filter !== 'all') params.append('status', filter);
      if (selectedAffiliate) params.append('affiliateUserId', selectedAffiliate);
      
      if (params.toString()) url += `?${params}`;
      
      const res = await fetch(url);
      
      if (res.status === 401 || res.status === 403) {
        router.push('/');
        return;
      }
      
      const data = await res.json();
      setEarnings(data.earnings || []);
      setSummary(data.summary || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const markAsPaid = async (earningId: string) => {
    if (!confirm('Подтвердить выплату комиссии?')) return;
    
    try {
      const res = await fetch('/api/admin/affiliate/earnings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ earningId }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        alert('Выплата подтверждена');
        fetchEarnings();
      } else {
        alert(`Ошибка: ${data.error}`);
      }
    } catch (err) {
      alert('Ошибка выплаты');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Комиссии партнёров</h1>
          <div className="text-[var(--muted)]">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Комиссии партнёров</h1>
          <button
            onClick={() => router.push('/admin/partners')}
            className="px-4 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface2)] border border-[var(--border)]"
          >
            ← К партнёрам
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="text-sm text-[var(--muted)] mb-1">Всего продаж</div>
            <div className="text-3xl font-bold">
              {summary.reduce((sum, s) => sum + s.total_sales_rub, 0).toLocaleString()}₽
            </div>
          </div>
          <div className="p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <div className="text-sm text-yellow-500 mb-1">К выплате</div>
            <div className="text-3xl font-bold text-yellow-500">
              {summary.reduce((sum, s) => sum + s.pending_rub, 0).toLocaleString()}₽
            </div>
          </div>
          <div className="p-6 rounded-xl bg-green-500/10 border border-green-500/20">
            <div className="text-sm text-green-500 mb-1">Выплачено</div>
            <div className="text-3xl font-bold text-green-500">
              {summary.reduce((sum, s) => sum + s.paid_rub, 0).toLocaleString()}₽
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'paid'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg border transition ${
                filter === f
                  ? 'bg-[var(--gold)] text-black border-[var(--gold)]'
                  : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface2)]'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'pending' ? 'К выплате' : 'Выплачено'}
            </button>
          ))}
        </div>

        {/* Partner Summary Table */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Партнёры</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-3">Партнёр</th>
                  <th className="text-left p-3">Tier</th>
                  <th className="text-right p-3">Продаж</th>
                  <th className="text-right p-3">Сумма</th>
                  <th className="text-right p-3">К выплате</th>
                  <th className="text-right p-3">Выплачено</th>
                </tr>
              </thead>
              <tbody>
                {summary.map((s) => (
                  <tr 
                    key={s.affiliate_user_id}
                    className="border-b border-[var(--border)] hover:bg-[var(--surface)] cursor-pointer"
                    onClick={() => setSelectedAffiliate(s.affiliate_user_id)}
                  >
                    <td className="p-3 font-medium">{s.display_name || s.username}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        s.tier === 'pro' ? 'bg-[var(--gold)]/20 text-[var(--gold)]' : 'bg-[var(--surface)] text-[var(--muted)]'
                      }`}>
                        {s.tier} ({s.percent}%)
                      </span>
                    </td>
                    <td className="p-3 text-right">{s.total_referrals}</td>
                    <td className="p-3 text-right">{s.total_sales_rub.toLocaleString()}₽</td>
                    <td className="p-3 text-right text-yellow-500">{s.pending_rub.toLocaleString()}₽</td>
                    <td className="p-3 text-right text-green-500">{s.paid_rub.toLocaleString()}₽</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Earnings List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Транзакции</h2>
          <div className="space-y-3">
            {earnings.map((e) => (
              <div
                key={e.id}
                className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">
                      {e.affiliate?.display_name || 'Unknown'} → {e.referral?.display_name || 'Unknown'}
                    </div>
                    <div className="text-sm text-[var(--muted)]">{e.tariff_name}</div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    e.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    e.status === 'paid' ? 'bg-green-500/20 text-green-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {e.status === 'pending' ? 'К выплате' : e.status === 'paid' ? 'Выплачено' : 'Отменено'}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-[var(--muted)]">
                    {new Date(e.created_at).toLocaleDateString('ru-RU')} • {e.amount_rub}₽ • {e.commission_percent}%
                  </div>
                  <div className="font-bold text-lg">{e.commission_rub}₽</div>
                </div>
                {e.status === 'pending' && (
                  <button
                    onClick={() => markAsPaid(e.id)}
                    className="mt-3 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 text-sm"
                  >
                    Подтвердить выплату
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
