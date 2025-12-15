'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Bell,
  TrendingUp,
  MessageCircle,
  Settings,
  LayoutDashboard,
  UserCheck,
  Clock,
  CreditCard,
  DollarSign,
  Star,
  Crown,
  Sparkles,
  Image as ImageIcon,
  UserCog,
} from 'lucide-react';
import { GalleryEditor, type EffectPreset } from '@/components/admin/gallery-editor';
import { toast } from 'sonner';

// ===== TYPES =====
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

interface TelegramUser {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  is_admin: boolean;
  created_at: string;
  last_login_at: string;
  can_notify?: boolean;
}

interface DashboardStats {
  totalUsers: number;
  usersWithNotifications: number;
  totalWaitlist: number;
  recentLogins: number;
}

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  type: string;
  created_at: string;
  profiles?: {
    email: string | null;
    full_name: string | null;
  };
}

interface Subscription {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  credits_per_month: number;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  profiles?: {
    email: string | null;
    full_name: string | null;
    plan: string | null;
  };
}

interface PaymentStats {
  totalActiveSubscriptions: number;
  totalPayments: number;
  totalRevenue: number;
  planCounts: Record<string, number>;
}

// ===== CONSTANTS =====
const WAITLIST_TYPES = [
  { id: 'academy', name: 'Академия', icon: GraduationCap, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'feature_video_ads', name: 'Видео-реклама', icon: Video, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  { id: 'feature_lifestyle', name: 'Lifestyle', icon: Camera, color: 'text-green-400', bg: 'bg-green-400/10' },
  { id: 'feature_ab_covers', name: 'A/B обложки', icon: FlaskConical, color: 'text-orange-400', bg: 'bg-orange-400/10' },
];

const TABS = [
  { id: 'overview', name: 'Обзор', icon: LayoutDashboard, adminOnly: true },
  { id: 'gallery', name: 'Галерея', icon: Sparkles, adminOnly: false },
  { id: 'payments', name: 'Платежи', icon: CreditCard, adminOnly: true },
  { id: 'waitlist', name: 'Waitlist', icon: Bell, adminOnly: true },
  { id: 'users', name: 'Пользователи', icon: Users, adminOnly: true },
  { id: 'managers', name: 'Менеджеры', icon: UserCog, adminOnly: true },
  { id: 'broadcast', name: 'Рассылка', icon: Send, adminOnly: true },
];

// ===== MAIN COMPONENT =====
export default function AdminPage() {
  const { user, loading: authLoading } = useTelegramAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState<WaitlistStats | null>(null);
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [waitlistSubs, setWaitlistSubs] = useState<any[]>([]);
  const [users, setUsers] = useState<TelegramUser[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>('academy');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  // Gallery state
  const [galleryPresets, setGalleryPresets] = useState<EffectPreset[]>([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  // Check if user is admin or manager
  const isAdmin = user?.isAdmin === true || user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const hasAccess = isAdmin || isManager;

  // Check admin/manager access
  useEffect(() => {
    if (!authLoading && !hasAccess) {
      window.location.href = '/';
    }
    // Managers should only see gallery tab
    if (!authLoading && isManager && !isAdmin) {
      setActiveTab('gallery');
    }
  }, [user, authLoading, hasAccess, isAdmin, isManager]);

  // Fetch gallery data
  const fetchGallery = useCallback(async () => {
    setGalleryLoading(true);
    try {
      const res = await fetch('/api/admin/gallery');
      if (res.ok) {
        const data = await res.json();
        // Transform from DB format to component format
        const presets = (data.effects || []).map((e: any) => ({
          id: e.id,
          presetId: e.preset_id,
          title: e.title,
          contentType: e.content_type,
          modelKey: e.model_key,
          tileRatio: e.tile_ratio,
          costStars: e.cost_stars,
          mode: e.mode,
          variantId: e.variant_id,
          previewImage: e.preview_image,
          templatePrompt: e.template_prompt,
          featured: e.featured,
          published: e.published,
          order: e.display_order || 0,
          createdAt: e.created_at,
          updatedAt: e.updated_at,
        }));
        setGalleryPresets(presets);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to fetch gallery:', errorData);
        toast.error(errorData.error || 'Ошибка загрузки галереи');
      }
    } catch (error) {
      console.error('Failed to fetch gallery:', error);
      toast.error('Ошибка сети при загрузке галереи');
    } finally {
      setGalleryLoading(false);
    }
  }, []);

  // Gallery handlers
  const handleGallerySave = async (preset: EffectPreset) => {
    const res = await fetch('/api/admin/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preset),
    });
    if (!res.ok) throw new Error('Save failed');
    await fetchGallery();
  };

  const handleGalleryDelete = async (presetId: string) => {
    const res = await fetch(`/api/admin/gallery?presetId=${presetId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Delete failed');
    await fetchGallery();
  };

  const handleGalleryReorder = async (presets: EffectPreset[]) => {
    // TODO: Implement reorder API
    setGalleryPresets(presets);
  };

  // Fetch all data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [statsRes, usersRes, waitlistRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch(`/api/admin/waitlist?type=${selectedType}`),
        fetch('/api/admin/payments'),
      ]);

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.waitlist);
        setDashboardStats(data.dashboard);
      }
      
      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || []);
      }
      
      if (waitlistRes.ok) {
        const data = await waitlistRes.json();
        setWaitlistSubs(data.subscriptions || []);
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPayments(data.payments || []);
        setSubscriptions(data.subscriptions || []);
        setPaymentStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasAccess) {
      if (isAdmin) {
        fetchData();
      }
      fetchGallery();
    }
  }, [hasAccess, isAdmin, selectedType, fetchGallery]);

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
        fetchData();
      } else {
        toast.error(data.error || 'Ошибка отправки');
      }
    } catch (error) {
      toast.error('Ошибка сети');
    } finally {
      setSending(false);
    }
  };

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  if (!hasAccess) {
    return null;
  }

  // Filter tabs based on role
  const visibleTabs = TABS.filter(tab => isAdmin || !tab.adminOnly);

  return (
    <main className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <div className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                {isManager && !isAdmin ? (
                  <Sparkles className="w-5 h-5 text-[var(--gold)]" />
                ) : (
                  <Settings className="w-5 h-5 text-[var(--gold)]" />
                )}
              </div>
              <div>
                <h1 className="text-xl font-bold text-[var(--text)]">
                  {isManager && !isAdmin ? 'Редактор галереи' : 'Админ-панель'}
                </h1>
                <p className="text-xs text-[var(--muted)]">
                  {isManager && !isAdmin ? 'Управление эффектами' : 'LensRoom Management'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isManager && !isAdmin && (
                <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                  Менеджер
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (isAdmin) fetchData();
                  fetchGallery();
                }}
                disabled={loading || galleryLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${(loading || galleryLoading) ? 'animate-spin' : ''}`} />
                Обновить
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {visibleTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[var(--gold)] text-black'
                  : 'bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface2)] border border-[var(--border)]'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && isAdmin && (
          <OverviewTab 
            dashboardStats={dashboardStats} 
            waitlistStats={stats}
            loading={loading}
          />
        )}

        {activeTab === 'gallery' && (
          <GalleryEditor
            presets={galleryPresets}
            onSave={handleGallerySave}
            onDelete={handleGalleryDelete}
            onReorder={handleGalleryReorder}
            loading={galleryLoading}
          />
        )}

        {activeTab === 'payments' && isAdmin && (
          <PaymentsTab
            payments={payments}
            subscriptions={subscriptions}
            stats={paymentStats}
            loading={loading}
          />
        )}

        {activeTab === 'waitlist' && isAdmin && (
          <WaitlistTab
            stats={stats}
            subscriptions={waitlistSubs}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            loading={loading}
          />
        )}

        {activeTab === 'users' && isAdmin && (
          <UsersTab users={users} loading={loading} />
        )}

        {activeTab === 'managers' && isAdmin && (
          <ManagersTab users={users} loading={loading} onRefresh={fetchData} />
        )}

        {activeTab === 'broadcast' && isAdmin && (
          <BroadcastTab
            stats={stats}
            selectedType={selectedType}
            setSelectedType={setSelectedType}
            broadcastMessage={broadcastMessage}
            setBroadcastMessage={setBroadcastMessage}
            sending={sending}
            handleBroadcast={handleBroadcast}
          />
        )}
      </div>
    </main>
  );
}

// ===== OVERVIEW TAB =====
function OverviewTab({ 
  dashboardStats, 
  waitlistStats,
  loading 
}: { 
  dashboardStats: DashboardStats | null;
  waitlistStats: WaitlistStats | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Main Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Всего пользователей"
          value={dashboardStats?.totalUsers || 0}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />
        <StatCard
          icon={Bell}
          label="С уведомлениями"
          value={dashboardStats?.usersWithNotifications || 0}
          color="text-green-400"
          bg="bg-green-400/10"
        />
        <StatCard
          icon={Clock}
          label="Входов за 7 дней"
          value={dashboardStats?.recentLogins || 0}
          color="text-purple-400"
          bg="bg-purple-400/10"
        />
        <StatCard
          icon={TrendingUp}
          label="Всего в Waitlist"
          value={dashboardStats?.totalWaitlist || 0}
          color="text-[var(--gold)]"
          bg="bg-[var(--gold)]/10"
        />
      </div>

      {/* Waitlist by Type */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Waitlist по типам</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {WAITLIST_TYPES.map(type => {
            const Icon = type.icon;
            const count = waitlistStats?.byType[type.id] || 0;
            return (
              <div key={type.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--surface2)]">
                <div className={`w-10 h-10 rounded-lg ${type.bg} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${type.color}`} />
                </div>
                <div>
                  <p className="text-xl font-bold text-[var(--text)]">{count}</p>
                  <p className="text-xs text-[var(--muted)]">{type.name}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ===== STAT CARD =====
function StatCard({ 
  icon: Icon, 
  label, 
  value, 
  color, 
  bg 
}: { 
  icon: any; 
  label: string; 
  value: number; 
  color: string; 
  bg: string;
}) {
  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-5">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-[var(--text)]">{value}</p>
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}

// ===== WAITLIST TAB =====
function WaitlistTab({
  stats,
  subscriptions,
  selectedType,
  setSelectedType,
  loading,
}: {
  stats: WaitlistStats | null;
  subscriptions: Subscription[];
  selectedType: string;
  setSelectedType: (type: string) => void;
  loading: boolean;
}) {
  return (
    <div className="space-y-6">
      {/* Type Selector */}
      <div className="flex flex-wrap gap-2">
        {WAITLIST_TYPES.map(type => {
          const Icon = type.icon;
          const count = stats?.byType[type.id] || 0;
          const isSelected = selectedType === type.id;
          
          return (
            <button
              key={type.id}
              onClick={() => setSelectedType(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                isSelected
                  ? 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]'
                  : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:border-[var(--gold)]/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{type.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${isSelected ? 'bg-[var(--gold)]/20' : 'bg-[var(--surface2)]'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Subscriptions Table */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Подписчики ({subscriptions.length})
          </h2>
        </div>
        
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
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
                      <StatusBadge status={sub.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== USERS TAB =====
function UsersTab({ users, loading }: { users: TelegramUser[]; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)]">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Все пользователи ({users.length})
        </h2>
      </div>
      
      {users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
          <p className="text-[var(--muted)]">Нет пользователей</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface2)]">
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Пользователь</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Telegram ID</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Уведомления</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Регистрация</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Последний вход</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--surface2)]">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--gold)]/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-[var(--gold)]">
                          {u.first_name?.[0] || u.telegram_username?.[0] || '?'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {u.first_name || 'Без имени'}
                          {u.is_admin && (
                            <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[var(--gold)]/20 text-[var(--gold)]">
                              Admin
                            </span>
                          )}
                        </p>
                        {u.telegram_username && (
                          <p className="text-xs text-[var(--muted)]">@{u.telegram_username}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--muted)] font-mono">
                    {u.telegram_id}
                  </td>
                  <td className="px-6 py-4">
                    {u.can_notify ? (
                      <span className="inline-flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Вкл
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
                        <AlertCircle className="w-3 h-3" />
                        Выкл
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--muted)]">
                    {new Date(u.created_at).toLocaleDateString('ru-RU')}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--muted)]">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('ru-RU') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ===== BROADCAST TAB =====
function BroadcastTab({
  stats,
  selectedType,
  setSelectedType,
  broadcastMessage,
  setBroadcastMessage,
  sending,
  handleBroadcast,
}: {
  stats: WaitlistStats | null;
  selectedType: string;
  setSelectedType: (type: string) => void;
  broadcastMessage: string;
  setBroadcastMessage: (msg: string) => void;
  sending: boolean;
  handleBroadcast: () => void;
}) {
  const selectedTypeInfo = WAITLIST_TYPES.find(t => t.id === selectedType);

  return (
    <div className="max-w-2xl space-y-6">
      {/* Type Selector */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Кому отправить
        </label>
        <div className="flex flex-wrap gap-2">
          {WAITLIST_TYPES.map(type => {
            const Icon = type.icon;
            const count = stats?.byType[type.id] || 0;
            const isSelected = selectedType === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-[var(--gold)]/10 border-[var(--gold)] text-[var(--gold)]'
                    : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text)] hover:border-[var(--gold)]/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{type.name}</span>
                <span className="text-xs opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Input */}
      <div>
        <label className="block text-sm font-medium text-[var(--text)] mb-2">
          Текст сообщения
        </label>
        <textarea
          value={broadcastMessage}
          onChange={(e) => setBroadcastMessage(e.target.value)}
          placeholder="Привет! У нас отличные новости..."
          className="w-full h-40 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)] text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:border-[var(--gold)] resize-none"
        />
        <p className="text-xs text-[var(--muted)] mt-2">
          Поддерживается HTML: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;, &lt;a href="..."&gt;ссылка&lt;/a&gt;
        </p>
      </div>

      {/* Preview */}
      {broadcastMessage && (
        <div>
          <label className="block text-sm font-medium text-[var(--text)] mb-2">
            Предпросмотр
          </label>
          <div className="p-4 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0088cc] flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-[var(--text)] mb-1">LensRoom</p>
                <div 
                  className="text-sm text-[var(--text2)]"
                  dangerouslySetInnerHTML={{ __html: broadcastMessage.replace(/\n/g, '<br>') }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Button */}
      <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
        <p className="text-sm text-[var(--muted)]">
          {selectedTypeInfo && (
            <>
              <selectedTypeInfo.icon className={`w-4 h-4 ${selectedTypeInfo.color} inline mr-1`} />
              Получат {stats?.byType[selectedType] || 0} подписчиков
            </>
          )}
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
          Отправить рассылку
        </Button>
      </div>
    </div>
  );
}

// ===== PAYMENTS TAB =====
function PaymentsTab({
  payments,
  subscriptions,
  stats,
  loading,
}: {
  payments: Payment[];
  subscriptions: Subscription[];
  stats: PaymentStats | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Crown}
          label="Активных подписок"
          value={stats?.totalActiveSubscriptions || 0}
          color="text-purple-400"
          bg="bg-purple-400/10"
        />
        <StatCard
          icon={CreditCard}
          label="Всего платежей"
          value={stats?.totalPayments || 0}
          color="text-blue-400"
          bg="bg-blue-400/10"
        />
        <StatCard
          icon={DollarSign}
          label="Выручка (₽)"
          value={stats?.totalRevenue || 0}
          color="text-green-400"
          bg="bg-green-400/10"
        />
        <StatCard
          icon={Star}
          label="Pro пользователей"
          value={stats?.planCounts?.['pro'] || 0}
          color="text-[var(--gold)]"
          bg="bg-[var(--gold)]/10"
        />
      </div>

      {/* Plan Distribution */}
      {stats?.planCounts && Object.keys(stats.planCounts).length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Распределение по тарифам</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.planCounts).map(([plan, count]) => (
              <div 
                key={plan} 
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--surface2)]"
              >
                <span className="text-sm font-medium text-[var(--text)] capitalize">{plan}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--gold)]/20 text-[var(--gold)]">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Subscriptions */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Подписки ({subscriptions.length})
          </h2>
        </div>
        
        {subscriptions.length === 0 ? (
          <div className="text-center py-12">
            <Crown className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
            <p className="text-[var(--muted)]">Нет активных подписок</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface2)]">
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Пользователь</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Тариф</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Кредитов/мес</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Статус</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Действует до</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-[var(--border)] hover:bg-[var(--surface2)]">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {sub.profiles?.full_name || 'Без имени'}
                        </p>
                        {sub.profiles?.email && (
                          <p className="text-xs text-[var(--muted)]">{sub.profiles.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-[var(--gold)] capitalize">
                        {sub.plan_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--text)]">
                      {sub.credits_per_month}
                    </td>
                    <td className="px-6 py-4">
                      <SubscriptionStatusBadge status={sub.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)]">
                      {sub.current_period_end 
                        ? new Date(sub.current_period_end).toLocaleDateString('ru-RU')
                        : '—'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Payments */}
      <div className="bg-[var(--surface)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Последние платежи ({payments.length})
          </h2>
        </div>
        
        {payments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
            <p className="text-[var(--muted)]">Нет платежей</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface2)]">
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Пользователь</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Сумма</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Тип</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Статус</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-[var(--muted)] uppercase">Дата</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[var(--border)] hover:bg-[var(--surface2)]">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-medium text-[var(--text)]">
                          {payment.profiles?.full_name || 'Без имени'}
                        </p>
                        {payment.profiles?.email && (
                          <p className="text-xs text-[var(--muted)]">{payment.profiles.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-[var(--text)]">
                      {payment.amount} {payment.currency || '₽'}
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)] capitalize">
                      {payment.type || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <PaymentStatusBadge status={payment.status} />
                    </td>
                    <td className="px-6 py-4 text-sm text-[var(--muted)]">
                      {new Date(payment.created_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== SUBSCRIPTION STATUS BADGE =====
function SubscriptionStatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Активна
      </span>
    );
  }
  if (status === 'cancelled' || status === 'canceled') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Отменена
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)] bg-[var(--surface2)] px-2 py-1 rounded-full">
      {status}
    </span>
  );
}

// ===== PAYMENT STATUS BADGE =====
function PaymentStatusBadge({ status }: { status: string }) {
  if (status === 'completed' || status === 'success') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Оплачен
      </span>
    );
  }
  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded-full">
        <Clock className="w-3 h-3" />
        Ожидание
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded-full">
        <AlertCircle className="w-3 h-3" />
        Ошибка
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)] bg-[var(--surface2)] px-2 py-1 rounded-full">
      {status}
    </span>
  );
}

// ===== STATUS BADGE =====
function StatusBadge({ status }: { status: string }) {
  if (status === 'active') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
        <CheckCircle2 className="w-3 h-3" />
        Активен
      </span>
    );
  }
  if (status === 'notified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-blue-400 bg-blue-400/10 px-2 py-1 rounded-full">
        <Send className="w-3 h-3" />
        Уведомлен
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)] bg-[var(--surface2)] px-2 py-1 rounded-full">
      <AlertCircle className="w-3 h-3" />
      {status}
    </span>
  );
}

