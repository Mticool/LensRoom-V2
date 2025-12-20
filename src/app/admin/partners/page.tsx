'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface AffiliateApplication {
  id: string;
  user_id: string;
  channel_url: string;
  followers: number | null;
  proof_text: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  profiles?: {
    display_name?: string;
    username?: string;
  };
}

export default function AdminPartnersPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    fetchApplications();
  }, [filter]);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const url = filter === 'all' 
        ? '/api/admin/partners'
        : `/api/admin/partners?status=${filter}`;
      
      const res = await fetch(url);
      
      if (res.status === 401 || res.status === 403) {
        router.push('/');
        return;
      }
      
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setApplications(data.applications || []);
    } catch (err) {
      setError('Failed to fetch applications');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (
    applicationId: string,
    action: 'approve' | 'reject',
    tier?: 'classic' | 'pro'
  ) => {
    try {
      const res = await fetch('/api/admin/partners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          action,
          tier: tier || 'classic',
          percent: tier === 'pro' ? 50 : 30,
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      alert(data.message);
      fetchApplications();
    } catch (err) {
      alert('Failed to update application');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Партнёрские заявки</h1>
          <div className="text-[var(--muted)]">Загрузка...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Партнёрские заявки</h1>
          <button
            onClick={() => router.push('/admin/referrals')}
            className="px-4 py-2 rounded-lg bg-[var(--surface)] hover:bg-[var(--surface2)] border border-[var(--border)]"
          >
            ← К статистике
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg border transition ${
                filter === f
                  ? 'bg-[var(--gold)] text-black border-[var(--gold)]'
                  : 'bg-[var(--surface)] text-[var(--text)] border-[var(--border)] hover:bg-[var(--surface2)]'
              }`}
            >
              {f === 'all' ? 'Все' : f === 'pending' ? 'На рассмотрении' : f === 'approved' ? 'Одобрено' : 'Отклонено'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
            {error}
          </div>
        )}

        {/* Applications List */}
        <div className="space-y-4">
          {applications.length === 0 ? (
            <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center text-[var(--muted)]">
              Нет заявок
            </div>
          ) : (
            applications.map((app) => (
              <div
                key={app.id}
                className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="font-semibold text-lg mb-1">
                      {app.profiles?.display_name || app.profiles?.username || 'Без имени'}
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      User ID: {app.user_id}
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                    app.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    app.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                    'bg-red-500/20 text-red-500'
                  }`}>
                    {app.status === 'pending' ? 'На рассмотрении' : app.status === 'approved' ? 'Одобрено' : 'Отклонено'}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div>
                    <span className="text-sm text-[var(--muted)]">Канал: </span>
                    <a
                      href={app.channel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--gold)] hover:underline"
                    >
                      {app.channel_url}
                    </a>
                  </div>
                  {app.followers !== null && (
                    <div>
                      <span className="text-sm text-[var(--muted)]">Подписчиков: </span>
                      <span className="font-medium">{app.followers.toLocaleString()}</span>
                    </div>
                  )}
                  {app.proof_text && (
                    <div>
                      <span className="text-sm text-[var(--muted)]">Комментарий: </span>
                      <span>{app.proof_text}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-sm text-[var(--muted)]">Дата подачи: </span>
                    <span>{new Date(app.created_at).toLocaleDateString('ru-RU')}</span>
                  </div>
                </div>

                {app.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(app.id, 'approve', 'classic')}
                      className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600"
                    >
                      Одобрить (Classic 30%)
                    </button>
                    <button
                      onClick={() => handleAction(app.id, 'approve', 'pro')}
                      className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black hover:opacity-90"
                    >
                      Одобрить (Pro 50%)
                    </button>
                    <button
                      onClick={() => handleAction(app.id, 'reject')}
                      className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600"
                    >
                      Отклонить
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
