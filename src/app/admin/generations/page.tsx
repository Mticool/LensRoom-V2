'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Image as ImageIcon,
  Video,
  Package,
  Loader2,
  Trash2,
  ExternalLink,
  Filter,
  ChevronDown,
  Sparkles,
  Clock,
  User,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Generation {
  id: string;
  user_id: string;
  type: string;
  model: string;
  prompt: string;
  result_url: string;
  credits_used: number;
  status: string;
  created_at: string;
  user_email?: string;
}

export default function GenerationsManager() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'product'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'processing' | 'failed'>('all');
  const [filterModel, setFilterModel] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedGeneration, setSelectedGeneration] = useState<Generation | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchGenerations();
  }, [filterType, filterModel, filterStatus]);

  const fetchGenerations = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      
      let query = supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus);
      }

      if (filterModel !== 'all') {
        query = query.eq('model', filterModel);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get user emails from profiles
      const userIds = [...new Set(data?.map((g: Generation) => g.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, email')
        .in('id', userIds);

      const generationsWithEmail = data?.map((gen: Generation) => ({
        ...gen,
        user_email: profilesData?.find((p: { id: string; email: string }) => p.id === gen.user_id)?.email || `user_${gen.user_id.slice(0, 8)}`,
      }));

      setGenerations(generationsWithEmail || []);

    } catch (error) {
      console.error('Error fetching generations:', error);
      toast.error('Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту генерацию?')) return;

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Удалено');
      fetchGenerations();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Удалить ${selectedIds.size} генераций?`)) return;

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('generations')
        .delete()
        .in('id', Array.from(selectedIds));

      if (error) throw error;

      toast.success(`Удалено ${selectedIds.size} генераций`);
      setSelectedIds(new Set());
      fetchGenerations();
    } catch (error) {
      toast.error('Ошибка удаления');
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const uniqueModels = Array.from(new Set(generations.map(g => g.model)));

  const stats = {
    total: generations.length,
    images: generations.filter(g => g.type === 'image').length,
    videos: generations.filter(g => g.type === 'video').length,
    products: generations.filter(g => g.type === 'product').length,
    totalCredits: generations.reduce((sum, g) => sum + g.credits_used, 0),
    completed: generations.filter(g => g.status === 'completed').length,
    failed: generations.filter(g => g.status === 'failed').length,
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case 'video': return <Video className="w-4 h-4 text-purple-400" />;
      case 'product': return <Package className="w-4 h-4 text-green-400" />;
      default: return <Sparkles className="w-4 h-4 text-[#c8ff00]" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case 'failed': return <XCircle className="w-3.5 h-3.5 text-red-400" />;
      case 'processing': return <RefreshCw className="w-3.5 h-3.5 text-yellow-400 animate-spin" />;
      default: return <AlertCircle className="w-3.5 h-3.5 text-white/40" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 60) return `${diffMins} мин`;
    if (diffHours < 24) return `${diffHours} ч`;
    
    return date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short'
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
            Генерации
          </h1>
          <p className="text-white/50">
            Все генерации пользователей
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              variant="outline"
              className="border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Удалить ({selectedIds.size})
            </Button>
          )}
          <Button
            onClick={fetchGenerations}
            variant="outline"
            className="border-white/10 text-white hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Обновить
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-4 h-4 text-[#c8ff00]" />
            <span className="text-xs text-white/50">Всего</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.total}</p>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-white/50">Фото</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.images}</p>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Video className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-white/50">Видео</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.videos}</p>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <Package className="w-4 h-4 text-green-400" />
            <span className="text-xs text-white/50">Продукты</span>
          </div>
          <p className="text-2xl font-bold text-white">{stats.products}</p>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-white/50">Успешно</span>
          </div>
          <p className="text-2xl font-bold text-white">
            {stats.completed}
            {stats.failed > 0 && (
              <span className="text-sm text-red-400 ml-2">/ {stats.failed} ошибок</span>
            )}
          </p>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="border-white/10 text-white hover:bg-white/5"
        >
          <Filter className="w-4 h-4 mr-2" />
          Фильтры
          <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
        </Button>
        
        {/* Quick filters */}
        <div className="flex gap-2">
          {['all', 'image', 'video', 'product'].map((type) => (
            <Button
              key={type}
              size="sm"
              variant={filterType === type ? 'default' : 'outline'}
              onClick={() => setFilterType(type as typeof filterType)}
              className={filterType === type 
                ? 'bg-[#c8ff00] text-black hover:bg-[#b8ef00]' 
                : 'border-white/10 text-white/70 hover:bg-white/5'
              }
            >
              {type === 'all' ? 'Все' : type === 'image' ? 'Фото' : type === 'video' ? 'Видео' : 'Продукты'}
            </Button>
          ))}
        </div>
      </div>

      {showFilters && (
        <Card className="p-4 bg-white/5 border-white/10">
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Статус
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50"
              >
                <option value="all">Все</option>
                <option value="completed">Завершено</option>
                <option value="processing">В процессе</option>
                <option value="failed">Ошибка</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-white/70 mb-2 block">
                Модель
              </label>
              <select
                value={filterModel}
                onChange={(e) => setFilterModel(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50"
              >
                <option value="all">Все</option>
                {uniqueModels.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={() => {
                  setFilterType('all');
                  setFilterStatus('all');
                  setFilterModel('all');
                }}
                variant="outline"
                className="w-full border-white/10 text-white hover:bg-white/5"
              >
                Сбросить фильтры
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {generations.map((gen, index) => (
          <motion.div
            key={gen.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card 
              className={`overflow-hidden bg-white/5 border-white/10 group cursor-pointer transition-all ${
                selectedIds.has(gen.id) ? 'ring-2 ring-[#c8ff00]' : ''
              }`}
              onClick={() => toggleSelect(gen.id)}
            >
              <div className="aspect-square bg-black/50 relative">
                {gen.result_url ? (
                  gen.type === 'video' ? (
                    <video
                      src={gen.result_url}
                      className="w-full h-full object-cover"
                      muted
                      loop
                      playsInline
                      onMouseEnter={(e) => e.currentTarget.play()}
                      onMouseLeave={(e) => {
                        e.currentTarget.pause();
                        e.currentTarget.currentTime = 0;
                      }}
                    />
                  ) : (
                    <img
                      src={gen.result_url}
                      alt={gen.prompt}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {gen.status === 'processing' ? (
                      <Loader2 className="w-8 h-8 text-[#c8ff00] animate-spin" />
                    ) : gen.status === 'failed' ? (
                      <XCircle className="w-8 h-8 text-red-400" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-white/20" />
                    )}
                  </div>
                )}

                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                {/* Actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {gen.result_url && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGeneration(gen);
                        }}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(gen.result_url, '_blank');
                        }}
                        className="border-white/20 text-white hover:bg-white/10"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(gen.id);
                    }}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                {/* Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-2">
                  <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur flex items-center gap-1.5">
                    {getTypeIcon(gen.type)}
                    <span className="text-xs text-white/70 capitalize">{gen.type}</span>
                  </div>
                </div>

                {/* Status */}
                <div className="absolute top-2 right-2">
                  <div className={`px-2 py-1 rounded-lg backdrop-blur flex items-center gap-1 ${
                    gen.status === 'completed' ? 'bg-emerald-500/20' :
                    gen.status === 'failed' ? 'bg-red-500/20' :
                    'bg-yellow-500/20'
                  }`}>
                    {getStatusIcon(gen.status)}
                  </div>
                </div>

                {/* Select checkbox */}
                <div className="absolute bottom-2 left-2">
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    selectedIds.has(gen.id) 
                      ? 'bg-[#c8ff00] border-[#c8ff00]' 
                      : 'border-white/30 bg-black/30'
                  }`}>
                    {selectedIds.has(gen.id) && (
                      <CheckCircle className="w-3 h-3 text-black" />
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded bg-white/5 text-xs text-white/60">{gen.model}</span>
                  <span className="text-xs text-[#c8ff00] font-medium">{gen.credits_used} ⭐</span>
                </div>
                <p className="text-sm text-white line-clamp-2 mb-2 min-h-[40px]">
                  {gen.prompt || 'Без промпта'}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-white/40">
                    <User className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{gen.user_email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-white/40">
                    <Clock className="w-3 h-3" />
                    {formatDate(gen.created_at)}
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Empty State */}
      {generations.length === 0 && (
        <Card className="p-12 text-center bg-white/5 border-white/10">
          <Sparkles className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Нет генераций</h3>
          <p className="text-white/50">Генерации появятся здесь</p>
        </Card>
      )}

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedGeneration && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedGeneration(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              <div className="grid md:grid-cols-2">
                {/* Preview */}
                <div className="aspect-square bg-black relative">
                  {selectedGeneration.type === 'video' ? (
                    <video
                      src={selectedGeneration.result_url}
                      className="w-full h-full object-contain"
                      controls
                      autoPlay
                      loop
                    />
                  ) : (
                    <img
                      src={selectedGeneration.result_url}
                      alt={selectedGeneration.prompt}
                      className="w-full h-full object-contain"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(selectedGeneration.type)}
                      <span className="text-white font-medium capitalize">{selectedGeneration.type}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedGeneration.status)}
                      <span className="text-sm text-white/70 capitalize">{selectedGeneration.status}</span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-white/50 block mb-1">Промпт</label>
                    <p className="text-white text-sm">{selectedGeneration.prompt || 'Без промпта'}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Модель</label>
                      <p className="text-white text-sm">{selectedGeneration.model}</p>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Кредиты</label>
                      <p className="text-[#c8ff00] text-sm font-medium">{selectedGeneration.credits_used} ⭐</p>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Пользователь</label>
                      <p className="text-white text-sm">{selectedGeneration.user_email}</p>
                    </div>
                    <div>
                      <label className="text-xs text-white/50 block mb-1">Дата</label>
                      <p className="text-white text-sm">
                        {new Date(selectedGeneration.created_at).toLocaleString('ru-RU')}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={() => window.open(selectedGeneration.result_url, '_blank')}
                      className="flex-1 bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Открыть
                    </Button>
                    <Button
                      onClick={() => {
                        handleDelete(selectedGeneration.id);
                        setSelectedGeneration(null);
                      }}
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Stats */}
      <div className="text-sm text-white/50 text-center">
        Показано {generations.length} генераций • {stats.totalCredits} кредитов использовано
      </div>
    </div>
  );
}
