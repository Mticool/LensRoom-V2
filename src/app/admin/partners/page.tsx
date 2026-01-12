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

interface AffiliateTier {
  user_id: string;
  tier: 'classic' | 'pro';
  percent: number;
  recurring_percent?: number | null;
  updated_at: string;
  profiles?: {
    display_name?: string;
    username?: string;
  };
}

export default function AdminPartnersPage() {
  const router = useRouter();
  const [applications, setApplications] = useState<AffiliateApplication[]>([]);
  const [partners, setPartners] = useState<AffiliateTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [activeTab, setActiveTab] = useState<'applications' | 'partners'>('applications');
  
  // Manual partner form
  const [showManualForm, setShowManualForm] = useState(false);
  const [manualUserId, setManualUserId] = useState('');
  // percent = first purchase percent
  const [manualPercent, setManualPercent] = useState(10);
  // recurringPercent = renewals / repeat purchases percent (passive). Default OFF.
  const [manualRecurringPercent, setManualRecurringPercent] = useState(0);

  useEffect(() => {
    if (activeTab === 'applications') {
      fetchApplications();
    } else {
      fetchPartners();
    }
  }, [filter, activeTab]);
  
  const fetchPartners = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/partners/tiers', { credentials: 'include' });
      const data = await res.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }
      
      setPartners(data.tiers || []);
    } catch (err) {
      setError('Failed to load partners');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
          // Default: first purchase 10%
          percent: 10,
          // Default: recurring OFF (0%) unless admin enables
          recurringPercent: 0,
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
      <div>
        <h1 className="text-3xl font-bold mb-8">Партнёрские заявки</h1>
        <div className="text-[var(--muted)]">Загрузка...</div>
      </div>
    );
  }

  const addManualPartner = async () => {
    if (!manualUserId.trim()) {
      alert('Введите User ID');
      return;
    }
    
    try {
      const res = await fetch('/api/admin/partners/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId: manualUserId.trim(),
          percent: manualPercent,
          recurringPercent: manualRecurringPercent,
          tier: manualPercent >= 50 ? 'pro' : 'classic',
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      alert(data.message);
      setShowManualForm(false);
      setManualUserId('');
      setManualPercent(10);
      setManualRecurringPercent(0);
      fetchPartners();
    } catch (err) {
      alert('Failed to add partner');
      console.error(err);
    }
  };
  
  const updatePartnerRates = async (userId: string, payload: { percent: number; recurringPercent: number }) => {
    if (!confirm(`Обновить комиссию?\n1-я покупка: ${payload.percent}%\nПовторные: ${payload.recurringPercent}%`)) return;
    
    try {
      const res = await fetch('/api/admin/partners/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userId,
          percent: payload.percent,
          recurringPercent: payload.recurringPercent,
          tier: payload.percent >= 50 ? 'pro' : 'classic',
        }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      alert(data.message);
      fetchPartners();
    } catch (err) {
      alert('Failed to update partner');
      console.error(err);
    }
  };
  
  const removePartner = async (userId: string) => {
    if (!confirm('Удалить партнера? Он вернется к обычной реферальной программе (звёзды).')) return;
    
    try {
      const res = await fetch('/api/admin/partners/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ userId }),
      });
      
      const data = await res.json();
      
      if (data.error) {
        alert(`Error: ${data.error}`);
        return;
      }
      
      alert(data.message);
      fetchPartners();
    } catch (err) {
      alert('Failed to remove partner');
      console.error(err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Партнёрская программа</h1>
        {activeTab === 'partners' && (
          <button
            onClick={() => setShowManualForm(true)}
            className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black font-medium hover:opacity-90 transition"
          >
            + Добавить партнера вручную
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('applications')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeTab === 'applications'
              ? 'text-[var(--gold)] border-[var(--gold)]'
              : 'text-[var(--muted)] border-transparent hover:text-[var(--text)]'
          }`}
        >
          Заявки
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-6 py-3 font-medium transition border-b-2 ${
            activeTab === 'partners'
              ? 'text-[var(--gold)] border-[var(--gold)]'
              : 'text-[var(--muted)] border-transparent hover:text-[var(--text)]'
          }`}
        >
          Активные партнёры
        </button>
      </div>

      {/* Manual Partner Form */}
      {showManualForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <h3 className="text-xl font-bold mb-4">Добавить партнера вручную</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-[var(--muted)] mb-2">User ID</label>
                <input
                  type="text"
                  value={manualUserId}
                  onChange={(e) => setManualUserId(e.target.value)}
                  placeholder="UUID пользователя или @username"
                  className="w-full px-4 py-2 rounded-lg bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)]"
                />
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-2">
                  1-я покупка: {manualPercent}%
                </label>
                <input
                  type="range"
                  min="10"
                  max="70"
                  step="5"
                  value={manualPercent}
                  onChange={(e) => setManualPercent(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
                  <span>10%</span>
                  <span>30% (classic)</span>
                  <span>50% (pro)</span>
                  <span>70%</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-[var(--muted)] mb-2">
                  Повторные/продления: {manualRecurringPercent}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={manualRecurringPercent}
                  onChange={(e) => setManualRecurringPercent(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-[var(--muted)] mt-1">
                  <span>0%</span>
                  <span>2%</span>
                  <span>3%</span>
                  <span>5%</span>
                  <span>10%</span>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={addManualPartner}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--gold)] text-black font-medium hover:opacity-90"
                >
                  Добавить
                </button>
                <button
                  onClick={() => {
                    setShowManualForm(false);
                    setManualUserId('');
                    setManualPercent(10);
                    setManualRecurringPercent(0);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--surface)]"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'applications' && (
        <>
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
                      Одобрить (10% + 0%)
                    </button>
                    <button
                      onClick={() => handleAction(app.id, 'approve', 'pro')}
                      className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black hover:opacity-90"
                    >
                      Одобрить (10% + 0%)
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
        </>
      )}

      {activeTab === 'partners' && (
        <>
          {error && (
            <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
              {error}
            </div>
          )}

          {/* Partners List */}
          <div className="space-y-4">
            {partners.length === 0 ? (
              <div className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-center text-[var(--muted)]">
                Нет активных партнёров
              </div>
            ) : (
              partners.map((partner) => (
                <div
                  key={partner.user_id}
                  className="p-6 rounded-xl bg-[var(--surface)] border border-[var(--border)]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-semibold text-lg mb-1">
                        {partner.profiles?.display_name || partner.profiles?.username || 'Без имени'}
                      </div>
                      <div className="text-sm text-[var(--muted)]">
                        User ID: {partner.user_id}
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      partner.tier === 'pro' 
                        ? 'bg-purple-500/20 text-purple-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {partner.tier === 'pro' ? 'Pro Partner' : 'Classic Partner'}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-3xl font-bold text-[var(--gold)] mb-1">
                      {partner.percent}% / {partner.recurring_percent ?? 0}%
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      1-я покупка / повторные (пассив)
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newFirst = prompt(
                          `Текущий процент 1-й покупки: ${partner.percent}%\nВведите новый процент (10-70):`,
                          String(partner.percent)
                        );
                        if (!newFirst) return;
                        const firstNum = parseInt(newFirst);
                        if (!(firstNum >= 10 && firstNum <= 70)) {
                          alert('Процент должен быть от 10 до 70');
                          return;
                        }
                        updatePartnerRates(partner.user_id, {
                          percent: firstNum,
                          recurringPercent: Number(partner.recurring_percent ?? 0),
                        });
                      }}
                      className="px-4 py-2 rounded-lg bg-[var(--gold)] text-black text-sm font-medium hover:opacity-90"
                    >
                      Изменить % (1-я)
                    </button>
                    <button
                      onClick={() => {
                        const currentRecurring = Number(partner.recurring_percent ?? 0);
                        const newRecurring = prompt(
                          `Текущий процент повторных/продлений: ${currentRecurring}%\nВведите новый процент (0-10, рекомендовано 2-5):`,
                          String(currentRecurring)
                        );
                        if (!newRecurring) return;
                        const recurringNum = parseInt(newRecurring);
                        if (!(recurringNum >= 0 && recurringNum <= 10)) {
                          alert('Процент должен быть от 0 до 10');
                          return;
                        }
                        updatePartnerRates(partner.user_id, {
                          percent: partner.percent,
                          recurringPercent: recurringNum,
                        });
                      }}
                      className="px-4 py-2 rounded-lg bg-[var(--surface2)] text-[var(--text)] text-sm font-medium hover:bg-[var(--surface)]"
                    >
                      Изменить % (повторные)
                    </button>
                    <button
                      onClick={() => removePartner(partner.user_id)}
                      className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-sm font-medium hover:bg-red-500/30"
                    >
                      Удалить партнера
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

