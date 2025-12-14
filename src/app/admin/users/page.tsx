'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Filter, 
  Download, 
  Mail, 
  Calendar,
  Sparkles,
  CreditCard,
  Image as ImageIcon,
  Loader2,
  ChevronDown,
  Ban,
  CheckCircle,
  MoreHorizontal,
  UserPlus,
  Trash2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface User {
  id: string;
  email: string;
  created_at: string;
  credits_amount: number;
  total_generations: number;
  total_spent: number;
  last_active: string;
  subscription_status: string;
}

interface CreditData {
  user_id: string;
  amount: number;
  created_at: string;
}

interface GenerationData {
  user_id: string;
  credits_used: number;
}

interface SubscriptionData {
  user_id: string;
  status: string;
}

interface PaymentData {
  user_id: string;
  amount: number;
}

interface ProfileData {
  id: string;
  email: string;
  full_name: string | null;
}

export default function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'credits' | 'generations'>('date');
  const [filterSubscription, setFilterSubscription] = useState<'all' | 'active' | 'none'>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchUsers();
  }, [sortBy, filterSubscription]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      // Get all users with their credits
      const { data: creditsData } = await supabase
        .from('credits')
        .select(`
          user_id,
          amount,
          created_at
        `);

      if (!creditsData) {
        setUsers([]);
        return;
      }

      // Get generations count per user
      const { data: generationsData } = await supabase
        .from('generations')
        .select('user_id, credits_used');

      // Get subscriptions
      const { data: subscriptionsData } = await supabase
        .from('subscriptions')
        .select('user_id, status');

      // Get payments
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('user_id, amount')
        .eq('status', 'completed');

      // Get profiles for email
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email, full_name');

      // Combine data
      const usersMap = new Map();

      creditsData.forEach((credit: CreditData) => {
        const profile = profilesData?.find((p: ProfileData) => p.id === credit.user_id);
        const userGenerations = generationsData?.filter((g: GenerationData) => g.user_id === credit.user_id) || [];
        const userSubscription = subscriptionsData?.find((s: SubscriptionData) => s.user_id === credit.user_id);
        const userPayments = paymentsData?.filter((p: PaymentData) => p.user_id === credit.user_id) || [];

        usersMap.set(credit.user_id, {
          id: credit.user_id,
          email: profile?.email || `user_${credit.user_id.slice(0, 8)}`,
          created_at: credit.created_at,
          credits_amount: credit.amount,
          total_generations: userGenerations.length,
          total_spent: userPayments.reduce((sum: number, p: PaymentData) => sum + (p.amount || 0), 0),
          last_active: credit.created_at,
          subscription_status: userSubscription?.status || 'none',
        });
      });

      let usersArray = Array.from(usersMap.values());

      // Apply filters
      if (filterSubscription !== 'all') {
        usersArray = usersArray.filter(u => 
          filterSubscription === 'active' 
            ? u.subscription_status === 'active'
            : u.subscription_status === 'none'
        );
      }

      // Apply sorting
      if (sortBy === 'date') {
        usersArray.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      } else if (sortBy === 'credits') {
        usersArray.sort((a, b) => b.credits_amount - a.credits_amount);
      } else if (sortBy === 'generations') {
        usersArray.sort((a, b) => b.total_generations - a.total_generations);
      }

      setUsers(usersArray);

    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleGiveCredits = async (userId: string) => {
    const amount = prompt('Сколько кредитов добавить?');
    if (!amount || isNaN(Number(amount))) return;

    try {
      const supabase = createClient();
      
      const user = users.find(u => u.id === userId);
      if (!user) return;

      const { error } = await supabase
        .from('credits')
        .update({ 
          amount: user.credits_amount + Number(amount),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Добавлено ${amount} кредитов`);
      fetchUsers();

    } catch (error) {
      console.error('Error giving credits:', error);
      toast.error('Ошибка');
    }
  };

  const handleBulkGiveCredits = async () => {
    if (selectedUsers.size === 0) {
      toast.error('Выберите пользователей');
      return;
    }

    const amount = prompt(`Сколько кредитов добавить ${selectedUsers.size} пользователям?`);
    if (!amount || isNaN(Number(amount))) return;

    try {
      const supabase = createClient();
      
      for (const userId of selectedUsers) {
        const user = users.find(u => u.id === userId);
        if (!user) continue;

        await supabase
          .from('credits')
          .update({ 
            amount: user.credits_amount + Number(amount),
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId);
      }

      toast.success(`Добавлено ${amount} кредитов ${selectedUsers.size} пользователям`);
      setSelectedUsers(new Set());
      fetchUsers();

    } catch (error) {
      console.error('Error giving credits:', error);
      toast.error('Ошибка');
    }
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Регистрация', 'Кредиты', 'Генерации', 'Потрачено', 'Подписка'];
    const rows = filteredUsers.map(u => [
      u.email,
      new Date(u.created_at).toLocaleDateString('ru-RU'),
      u.credits_amount,
      u.total_generations,
      u.total_spent,
      u.subscription_status,
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `users-${Date.now()}.csv`;
    link.click();

    toast.success('CSV экспортирован');
  };

  const toggleSelectUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filteredUsers.map(u => u.id)));
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: users.length,
    withSubscription: users.filter(u => u.subscription_status === 'active').length,
    totalCredits: users.reduce((sum, u) => sum + u.credits_amount, 0),
    totalRevenue: users.reduce((sum, u) => sum + u.total_spent, 0),
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[#c8ff00] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Пользователи
          </h1>
          <p className="text-white/50">
            Управление пользователями платформы
          </p>
        </div>
        <Button 
          onClick={exportToCSV}
          className="bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
        >
          <Download className="w-4 h-4 mr-2" />
          Экспорт CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Mail className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-xs text-white/50">Всего</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.withSubscription}</p>
              <p className="text-xs text-white/50">С подпиской</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c8ff00]/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#c8ff00]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalCredits.toLocaleString()}</p>
              <p className="text-xs text-white/50">Кредитов</p>
            </div>
          </div>
        </Card>

        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.totalRevenue.toLocaleString()}₽</p>
              <p className="text-xs text-white/50">Доход</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по email..."
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00]"
          />
        </div>

        {/* Filters */}
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="border-white/10 text-white hover:bg-white/5"
        >
          <Filter className="w-4 h-4 mr-2" />
          Фильтры
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>

        {/* Bulk Actions */}
        {selectedUsers.size > 0 && (
          <Button
            onClick={handleBulkGiveCredits}
            className="bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            +Кредиты ({selectedUsers.size})
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Подписка
              </label>
              <select
                value={filterSubscription}
                onChange={(e) => setFilterSubscription(e.target.value as 'all' | 'active' | 'none')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50"
              >
                <option value="all">Все</option>
                <option value="active">С подпиской</option>
                <option value="none">Без подписки</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Сортировка
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'date' | 'credits' | 'generations')}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50"
              >
                <option value="date">По дате регистрации</option>
                <option value="credits">По кредитам</option>
                <option value="generations">По генерациям</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Users Table */}
      <Card className="overflow-hidden bg-white/5 border-white/10">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/[0.02] border-b border-white/10">
              <tr>
                <th className="px-4 py-4 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.size === filteredUsers.length && filteredUsers.length > 0}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#c8ff00] focus:ring-[#c8ff00]"
                  />
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Регистрация
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Кредиты
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Генерации
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Потрачено
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Подписка
                </th>
                <th className="px-4 py-4 text-left text-xs font-medium text-white/50 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`hover:bg-white/[0.02] transition-colors ${
                    selectedUsers.has(user.id) ? 'bg-[#c8ff00]/5' : ''
                  }`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.has(user.id)}
                      onChange={() => toggleSelectUser(user.id)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#c8ff00] focus:ring-[#c8ff00]"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#c8ff00]/20 to-[#c8ff00]/5 flex items-center justify-center">
                        <span className="text-sm font-semibold text-[#c8ff00]">
                          {user.email.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-white font-medium">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-white/50">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(user.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#c8ff00]" />
                      <span className="text-sm font-semibold text-white">{user.credits_amount}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 text-sm text-white/70">
                      <ImageIcon className="w-3.5 h-3.5" />
                      {user.total_generations}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-sm font-medium text-white">
                      {user.total_spent.toLocaleString()}₽
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {user.subscription_status === 'active' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle className="w-3 h-3" />
                        Активна
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-white/40 border border-white/10">
                        <Ban className="w-3 h-3" />
                        Нет
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGiveCredits(user.id)}
                        className="border-white/10 text-white hover:bg-white/5 text-xs"
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        +Кредиты
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="p-12 text-center">
            <Mail className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/50">Пользователи не найдены</p>
          </div>
        )}
      </Card>

      {/* Pagination Info */}
      <div className="flex items-center justify-between text-sm text-white/50">
        <span>
          Показано {filteredUsers.length} из {users.length} пользователей
        </span>
        {selectedUsers.size > 0 && (
          <span className="text-[#c8ff00]">
            Выбрано: {selectedUsers.size}
          </span>
        )}
      </div>
    </div>
  );
}
