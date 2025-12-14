'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { 
  Users, 
  Image as ImageIcon, 
  Video, 
  Package, 
  CreditCard, 
  TrendingUp, 
  Loader2,
  Sparkles,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalGenerations: number;
  totalRevenue: number;
  todayGenerations: number;
  todayRevenue: number;
  photoCount: number;
  videoCount: number;
  productCount: number;
}

interface Generation {
  id: string;
  type: string;
  model: string;
  prompt: string;
  result_url: string | null;
  credits_used: number;
  status: string;
  created_at: string;
  user_id: string;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalGenerations: 0,
    totalRevenue: 0,
    todayGenerations: 0,
    todayRevenue: 0,
    photoCount: 0,
    videoCount: 0,
    productCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentGenerations, setRecentGenerations] = useState<Generation[]>([]);

  useEffect(() => {
    fetchStats();
    fetchRecentGenerations();
  }, []);

  const fetchStats = async () => {
    try {
      const supabase = createClient();

      // Total users
      const { count: totalUsers } = await supabase
        .from('credits')
        .select('*', { count: 'exact', head: true });

      // Active users (generated in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: activeUsersData } = await supabase
        .from('generations')
        .select('user_id')
        .gte('created_at', thirtyDaysAgo.toISOString());

      const activeUsers = new Set(activeUsersData?.map((g: { user_id: string }) => g.user_id)).size;

      // Total generations
      const { count: totalGenerations } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true });

      // Generation types
      const { count: photoCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'image');

      const { count: videoCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'video');

      const { count: productCount } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'product');

      // Total revenue
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed');

      const totalRevenue = paymentsData?.reduce((sum: number, p: { amount: number | null }) => sum + (p.amount || 0), 0) || 0;

      // Today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count: todayGenerations } = await supabase
        .from('generations')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', today.toISOString());

      const { data: todayPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      const todayRevenue = todayPayments?.reduce((sum: number, p: { amount: number | null }) => sum + (p.amount || 0), 0) || 0;

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers,
        totalGenerations: totalGenerations || 0,
        totalRevenue,
        todayGenerations: todayGenerations || 0,
        todayRevenue,
        photoCount: photoCount || 0,
        videoCount: videoCount || 0,
        productCount: productCount || 0,
      });

    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentGenerations = async () => {
    try {
      const supabase = createClient();
      
      const { data } = await supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentGenerations(data || []);
    } catch (error) {
      console.error('Error fetching recent generations:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case 'video': return <Video className="w-4 h-4 text-purple-400" />;
      case 'product': return <Package className="w-4 h-4 text-green-400" />;
      default: return <Sparkles className="w-4 h-4 text-[#c8ff00]" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#c8ff00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-white/50">
          Обзор платформы LensRoom
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <ArrowUpRight className="w-3 h-3" />
              {stats.activeUsers} активных
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {stats.totalUsers.toLocaleString()}
          </h3>
          <p className="text-sm text-white/50">
            Всего пользователей
          </p>
        </Card>

        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-[#c8ff00]/10 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-[#c8ff00]" />
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <ArrowUpRight className="w-3 h-3" />
              +{stats.todayGenerations} сегодня
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {stats.totalGenerations.toLocaleString()}
          </h3>
          <p className="text-sm text-white/50">
            Всего генераций
          </p>
        </Card>

        <Card className="p-6 bg-white/5 border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
              <ArrowUpRight className="w-3 h-3" />
              +{stats.todayRevenue.toLocaleString()}₽
            </span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">
            {stats.totalRevenue.toLocaleString()}₽
          </h3>
          <p className="text-sm text-white/50">
            Общий доход
          </p>
        </Card>
      </div>

      {/* Generation Types */}
      <Card className="p-6 bg-white/5 border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">
          Генерации по типам
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-5 h-5 text-blue-400" />
              <span className="text-sm text-white/70">Фото</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.photoCount.toLocaleString()}</p>
            <p className="text-xs text-white/40">
              {stats.totalGenerations > 0 
                ? `${Math.round((stats.photoCount / stats.totalGenerations) * 100)}%` 
                : '0%'}
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Video className="w-5 h-5 text-purple-400" />
              <span className="text-sm text-white/70">Видео</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.videoCount.toLocaleString()}</p>
            <p className="text-xs text-white/40">
              {stats.totalGenerations > 0 
                ? `${Math.round((stats.videoCount / stats.totalGenerations) * 100)}%` 
                : '0%'}
            </p>
          </div>
          <div className="p-4 bg-white/5 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-5 h-5 text-green-400" />
              <span className="text-sm text-white/70">Продукты</span>
            </div>
            <p className="text-2xl font-bold text-white">{stats.productCount.toLocaleString()}</p>
            <p className="text-xs text-white/40">
              {stats.totalGenerations > 0 
                ? `${Math.round((stats.productCount / stats.totalGenerations) * 100)}%` 
                : '0%'}
            </p>
          </div>
        </div>
      </Card>

      {/* Recent Generations */}
      <Card className="p-6 bg-white/5 border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">
            Последние генерации
          </h3>
          <span className="text-xs text-white/40 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Обновляется в реальном времени
          </span>
        </div>
        <div className="space-y-3">
          {recentGenerations.length === 0 ? (
            <p className="text-center text-white/40 py-8">Нет генераций</p>
          ) : (
            recentGenerations.map((gen) => (
              <div
                key={gen.id}
                className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.02] hover:bg-white/5 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-white/5 overflow-hidden flex-shrink-0">
                  {gen.result_url ? (
                    gen.type === 'video' ? (
                      <video 
                        src={gen.result_url} 
                        className="w-full h-full object-cover" 
                        muted 
                        playsInline
                      />
                    ) : (
                      <img 
                        src={gen.result_url} 
                        alt=""
                        className="w-full h-full object-cover" 
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getTypeIcon(gen.type)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white line-clamp-1">
                    {gen.prompt || 'Без промпта'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {getTypeIcon(gen.type)}
                    <span className="text-xs text-white/40">{gen.model}</span>
                    <span className="text-xs text-white/40">•</span>
                    <span className="text-xs text-[#c8ff00]">{gen.credits_used} ⭐</span>
                    <span className="text-xs text-white/40">•</span>
                    <span className={`text-xs ${
                      gen.status === 'completed' ? 'text-emerald-400' : 
                      gen.status === 'failed' ? 'text-red-400' : 
                      'text-yellow-400'
                    }`}>
                      {gen.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-white/40 flex-shrink-0">
                  {formatDate(gen.created_at)}
                </div>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
