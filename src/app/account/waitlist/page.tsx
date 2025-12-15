'use client';

import { useState, useEffect } from 'react';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  Send, 
  RefreshCw, 
  GraduationCap, 
  Video, 
  Camera, 
  FlaskConical,
  BarChart3,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface WaitlistStats {
  byType: Record<string, number>;
  totalCanNotify: number;
}

interface Subscription {
  id: string;
  profile_id: string;
  type: string;
  source: string | null;
  status: string;
  created_at: string;
  notified_at: string | null;
  telegram_profiles: {
    telegram_username: string | null;
    first_name: string | null;
    telegram_id: number;
  };
}

const WAITLIST_TYPES = [
  { id: 'academy', name: 'Академия', icon: GraduationCap, color: 'text-purple-400' },
  { id: 'feature_video_ads', name: 'Видео-реклама', icon: Video, color: 'text-blue-400' },
  { id: 'feature_lifestyle', name: 'Lifestyle', icon: Camera, color: 'text-green-400' },
  { id: 'feature_ab_covers', name: 'A/B обложки', icon: FlaskConical, color: 'text-orange-400' },
  { id: 'feature_infographics', name: 'Инфографика', icon: BarChart3, color: 'text-pink-400' },
];

export default function AdminWaitlistPage() {
  const { user, loading: authLoading } = useTelegramAuth();
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('academy');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      window.location.href = '/';
    }
  }, [user, authLoading]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/telegram/broadcast');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Fetch subscriptions
  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/waitlist?type=${selectedType}`);
      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      }
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.isAdmin) {
      fetchStats();
      fetchSubscriptions();
    }
  }, [user, selectedType]);

  // Send broadcast
  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) {
      toast.error('Введите текст сообщения');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/telegram/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          message: broadcastMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Отправлено: ${data.sent}, Ошибок: ${data.failed}`);
        setBroadcastMessage('');
        fetchStats();
        fetchSubscriptions();
      } else {
        toast.error(data.error || 'Ошибка отправки');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setSending(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!user?.isAdmin) {
    return null;
  }

  const selectedTypeInfo = WAITLIST_TYPES.find(t => t.id === selectedType);

  return (
    <main className="min-h-screen bg-[var(--bg)] py-8">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--text)] mb-2">
            Управление Waitlist
          </h1>
          <p className="text-[var(--muted)]">
            Просмотр подписчиков и отправка уведомлений
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {WAITLIST_TYPES.map(type => {
            const Icon = type.icon;
            const count = stats?.byType[type.id] || 0;
            const isSelected = selectedType === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-4 rounded-xl border transition-all text-left ${
                  isSelected
                    ? 'bg-[var(--gold)]/10 border-[var(--gold)]'
                    : 'bg-[var(--surface)] border-[var(--border)] hover:border-[var(--gold)]/50'
                }`}
              >
                <Icon className={`w-5 h-5 ${type.color} mb-2`} />
                <p className="text-2xl font-bold text-[var(--text)]">{count}</p>
                <p className="text-xs text-[var(--muted)] truncate">{type.name}</p>
              </button>
            );
          })}
          
          {/* Total with notifications */}
          <div className="p-4 rounded-xl border bg-[var(--surface)] border-[var(--border)]">
            <Users className="w-5 h-5 text-[var(--gold)] mb-2" />
            <p className="text-2xl font-bold text-[var(--gold)]">{stats?.totalCanNotify || 0}</p>
            <p className="text-xs text-[var(--muted)]">С уведомл.</p>
          </div>
        </div>

        {/* Broadcast Section */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            {selectedTypeInfo && <selectedTypeInfo.icon className={`w-5 h-5 ${selectedTypeInfo.color}`} />}
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Рассылка: {selectedTypeInfo?.name}
            </h2>
          </div>
          
          <textarea
            value={broadcastMessage}
            onChange={(e) => setBroadcastMessage(e.target.value)}
            placeholder="Текст сообщения для рассылки..."
            className="w-full h-32 px-4 py-3 rounded-xl bg-[var(--surface2)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] resize-none mb-4"
          />
          
          <div className="flex items-center justify-between">
            <p className="text-sm text-[var(--muted)]">
              Будет отправлено {stats?.byType[selectedType] || 0} подписчикам с включенными уведомлениями
            </p>
            <Button
              onClick={handleBroadcast}
              disabled={sending || !broadcastMessage.trim()}
              className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Отправить
            </Button>
          </div>
        </div>

        {/* Subscriptions Table */}
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text)]">
              Подписчики ({subscriptions.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchSubscriptions}
              disabled={loading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Обновить
            </Button>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
              <p className="text-[var(--muted)]">Нет подписчиков</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface2)]">
                    <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Пользователь</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Источник</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Дата</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Статус</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.map((sub) => (
                    <tr key={sub.id} className="border-b border-[var(--border)] hover:bg-[var(--surface2)]">
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-[var(--text)]">
                            {sub.telegram_profiles?.first_name || 'Без имени'}
                          </p>
                          {sub.telegram_profiles?.telegram_username && (
                            <p className="text-xs text-[var(--muted)]">
                              @{sub.telegram_profiles.telegram_username}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">
                        {sub.source || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--muted)]">
                        {new Date(sub.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4">
                        {sub.status === 'active' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400">
                            <CheckCircle2 className="w-3 h-3" />
                            Активен
                          </span>
                        ) : sub.status === 'notified' ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-400">
                            <Send className="w-3 h-3" />
                            Уведомлен
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                            <AlertCircle className="w-3 h-3" />
                            {sub.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

