'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/auth-provider';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  Trash2, 
  RefreshCw, 
  Filter,
  Image as ImageIcon,
  Video,
  Package,
  Loader2,
  ExternalLink,
  Calendar,
  Sparkles,
  ChevronDown,
  Grid3x3,
  List,
  CheckSquare,
  Square
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface Generation {
  id: string;
  type: 'image' | 'video' | 'product';
  model: string;
  prompt: string;
  result_url: string;
  credits_used: number;
  status: string;
  created_at: string;
  metadata: Record<string, unknown>;
}

// Helper to get all URLs from result_url (may be JSON array or single URL)
function getResultUrls(result_url: string): string[] {
  if (!result_url) return [];
  try {
    // Try parsing as JSON array
    const parsed = JSON.parse(result_url);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Not JSON, return as single URL
  }
  return [result_url];
}

export default function LibraryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'image' | 'video' | 'product'>('all');
  const [filterModel, setFilterModel] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'credits'>('date');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const fetchGenerations = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      
      let query = supabase
        .from('generations')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .not('result_url', 'is', null);

      if (filterType !== 'all') {
        query = query.eq('type', filterType);
      }

      if (filterModel !== 'all') {
        query = query.eq('model', filterModel);
      }

      if (sortBy === 'date') {
        query = query.order('created_at', { ascending: false });
      } else {
        query = query.order('credits_used', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Expand generations with multiple results into separate items
      const expanded: Generation[] = [];
      for (const gen of data || []) {
        const urls = getResultUrls(gen.result_url);
        if (urls.length > 1) {
          // Multiple results - create separate entries
          urls.forEach((url, idx) => {
            expanded.push({
              ...gen,
              id: `${gen.id}_${idx}`,
              result_url: url,
            });
          });
        } else {
          expanded.push(gen);
        }
      }

      setGenerations(expanded);
    } catch (error) {
      console.error('Error fetching generations:', error);
      toast.error('Ошибка загрузки библиотеки');
    } finally {
      setLoading(false);
    }
  }, [user, filterType, filterModel, sortBy]);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
    fetchGenerations();
  }, [user, router, fetchGenerations]);

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту генерацию?')) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('generations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setGenerations(prev => prev.filter(g => g.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      toast.success('Удалено');
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Удалить выбранные генерации (${selectedIds.length})?`)) return;

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('generations')
        .delete()
        .in('id', selectedIds);

      if (error) throw error;

      setGenerations(prev => prev.filter(g => !selectedIds.includes(g.id)));
      setSelectedIds([]);
      toast.success(`Удалено: ${selectedIds.length}`);
    } catch {
      toast.error('Ошибка при удалении');
    }
  };

  const handleDownload = (url: string, type: string, prompt: string) => {
    const link = document.createElement('a');
    link.href = url;
    const fileName = `lensroom-${type}-${prompt.slice(0, 20).replace(/\s+/g, '-')}-${Date.now()}.${type === 'video' ? 'mp4' : 'png'}`;
    link.download = fileName;
    link.click();
    toast.success('Скачивание началось');
  };

  const handleRegenerate = (gen: Generation) => {
    // Redirect to generator with pre-filled prompt
    const url = gen.type === 'image' 
      ? '/create' 
      : gen.type === 'video' 
        ? '/video' 
        : '/products';
    
    router.push(`${url}?prompt=${encodeURIComponent(gen.prompt)}&model=${gen.model}`);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === generations.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(generations.map(g => g.id));
    }
  };

  const getTypeIcon = (type: string) => {
    switch(type) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'product': return <Package className="w-4 h-4" />;
      default: return <Sparkles className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch(type) {
      case 'image': return 'Фото';
      case 'video': return 'Видео';
      case 'product': return 'Продукт';
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} дн назад`;
    
    return date.toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const uniqueModels = Array.from(new Set(generations.map(g => g.model)));

  const stats = {
    total: generations.length,
    images: generations.filter(g => g.type === 'image').length,
    videos: generations.filter(g => g.type === 'video').length,
    products: generations.filter(g => g.type === 'product').length,
    totalCredits: generations.reduce((sum, g) => sum + g.credits_used, 0),
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12 flex items-center justify-center">
        <Card className="p-12 text-center max-w-md bg-white/5 border-white/10">
          <Sparkles className="w-16 h-16 text-[#c8ff00] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">
            Войдите чтобы увидеть библиотеку
          </h2>
          <p className="text-white/50 mb-6">
            Здесь будут храниться все ваши генерации
          </p>
          <Button onClick={() => router.push('/')} className="bg-[#c8ff00] text-black hover:bg-[#b8ef00]">
            Вернуться на главную
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] pt-20 pb-12">
      <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Библиотека
          </h1>
          <p className="text-white/50">
            Все ваши созданные работы в одном месте
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#c8ff00]/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#c8ff00]" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
                <p className="text-xs text-white/50">Всего</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ImageIcon className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.images}</p>
                <p className="text-xs text-white/50">Фото</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Video className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.videos}</p>
                <p className="text-xs text-white/50">Видео</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.products}</p>
                <p className="text-xs text-white/50">Продукты</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-white/5 border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-white">{stats.totalCredits}</p>
                <p className="text-xs text-white/50">Кредитов</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            {/* Filters Toggle */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="border-white/10 text-white hover:bg-white/5"
            >
              <Filter className="w-4 h-4 mr-2" />
              Фильтры
              <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>

            {/* View Mode */}
            <div className="flex gap-1 p-1 bg-white/5 rounded-lg border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-[#c8ff00] text-black' 
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <Grid3x3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-[#c8ff00] text-black' 
                    : 'text-white/50 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Bulk Actions */}
            {selectedIds.length > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2"
              >
                <span className="text-sm text-white/50">
                  Выбрано: {selectedIds.length}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBulkDelete}
                  className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Удалить
                </Button>
              </motion.div>
            )}

            {/* Select All */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectAll}
              className="border-white/10 text-white hover:bg-white/5"
            >
              {selectedIds.length === generations.length && generations.length > 0 ? (
                <CheckSquare className="w-4 h-4 mr-1 text-[#c8ff00]" />
              ) : (
                <Square className="w-4 h-4 mr-1" />
              )}
              Все
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchGenerations}
              disabled={loading}
              className="border-white/10 text-white hover:bg-white/5"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Filters Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-6"
            >
              <Card className="p-4 bg-white/5 border-white/10">
                <div className="grid md:grid-cols-3 gap-4">
                  {/* Type Filter */}
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">
                      Тип
                    </label>
                    <select
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value as 'all' | 'image' | 'video' | 'product')}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#c8ff00]/50"
                    >
                      <option value="all">Все типы</option>
                      <option value="image">Фото</option>
                      <option value="video">Видео</option>
                      <option value="product">Продукты</option>
                    </select>
                  </div>

                  {/* Model Filter */}
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">
                      Модель
                    </label>
                    <select
                      value={filterModel}
                      onChange={(e) => setFilterModel(e.target.value)}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#c8ff00]/50"
                    >
                      <option value="all">Все модели</option>
                      {uniqueModels.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">
                      Сортировка
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as 'date' | 'credits')}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-[#c8ff00]/50"
                    >
                      <option value="date">По дате</option>
                      <option value="credits">По кредитам</option>
                    </select>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#c8ff00] animate-spin" />
          </div>
        ) : generations.length === 0 ? (
          <Card className="p-12 text-center bg-white/5 border-white/10">
            <Sparkles className="w-16 h-16 text-white/30 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">
              Пока пусто
            </h3>
            <p className="text-white/50 mb-6">
              {filterType !== 'all' || filterModel !== 'all'
                ? 'Нет генераций с выбранными фильтрами'
                : 'Создайте свою первую генерацию!'}
            </p>
            {filterType === 'all' && filterModel === 'all' && (
              <div className="flex gap-3 justify-center">
                <Button 
                  onClick={() => router.push('/create')}
                  className="bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  Создать фото
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/video')}
                  className="border-white/20 text-white hover:bg-white/5"
                >
                  <Video className="w-4 h-4 mr-2" />
                  Создать видео
                </Button>
              </div>
            )}
          </Card>
        ) : (
          <>
            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {generations.map((gen, index) => (
                  <motion.div
                    key={gen.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="overflow-hidden group relative bg-white/5 border-white/10 hover:border-[#c8ff00]/30 transition-colors">
                      {/* Select Checkbox */}
                      <div className="absolute top-2 left-2 z-10">
                        <button
                          onClick={() => toggleSelect(gen.id)}
                          className="w-6 h-6 rounded bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/80 transition-colors"
                        >
                          {selectedIds.includes(gen.id) ? (
                            <CheckSquare className="w-4 h-4 text-[#c8ff00]" />
                          ) : (
                            <Square className="w-4 h-4 text-white/50" />
                          )}
                        </button>
                      </div>

                      {/* Type Badge */}
                      <div className="absolute top-2 right-2 z-10">
                        <div className="px-2 py-1 rounded bg-black/60 backdrop-blur-sm border border-white/20 flex items-center gap-1">
                          {getTypeIcon(gen.type)}
                          <span className="text-xs font-medium text-white">
                            {getTypeLabel(gen.type)}
                          </span>
                        </div>
                      </div>

                      {/* Media */}
                      <div className="aspect-square bg-white/5 relative">
                        {gen.type === 'video' ? (
                          <video
                            src={gen.result_url}
                            className="w-full h-full object-cover"
                            muted
                            loop
                            playsInline
                            onMouseEnter={(e) => e.currentTarget.play()}
                            onMouseLeave={(e) => e.currentTarget.pause()}
                          />
                        ) : (
                          <img
                            src={gen.result_url}
                            alt={gen.prompt}
                            className="w-full h-full object-cover"
                          />
                        )}

                        {/* Hover Actions */}
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleDownload(gen.result_url, gen.type, gen.prompt)}
                            className="bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(gen.result_url, '_blank')}
                            className="border-white/30 text-white hover:bg-white/10"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerate(gen)}
                            className="border-white/30 text-white hover:bg-white/10"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(gen.id)}
                            className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-3">
                        <p className="text-sm text-white line-clamp-2 mb-2">
                          {gen.prompt}
                        </p>
                        <div className="flex items-center justify-between text-xs text-white/50">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(gen.created_at)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#c8ff00]" />
                            <span>{gen.credits_used} ⭐</span>
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/50">
                            {gen.model}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {generations.map((gen, index) => (
                  <motion.div
                    key={gen.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className="p-4 bg-white/5 border-white/10 hover:border-[#c8ff00]/30 transition-colors">
                      <div className="flex items-center gap-4">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleSelect(gen.id)}
                          className="flex-shrink-0"
                        >
                          {selectedIds.includes(gen.id) ? (
                            <CheckSquare className="w-5 h-5 text-[#c8ff00]" />
                          ) : (
                            <Square className="w-5 h-5 text-white/50" />
                          )}
                        </button>

                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-white/5">
                          {gen.type === 'video' ? (
                            <video
                              src={gen.result_url}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <img
                              src={gen.result_url}
                              alt={gen.prompt}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-1">
                            <span className="text-white/50">{getTypeIcon(gen.type)}</span>
                            <p className="text-sm text-white line-clamp-1 flex-1">
                              {gen.prompt}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-white/50">
                            <span>{gen.model}</span>
                            <span>•</span>
                            <span>{formatDate(gen.created_at)}</span>
                            <span>•</span>
                            <span className="text-[#c8ff00]">{gen.credits_used} ⭐</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDownload(gen.result_url, gen.type, gen.prompt)}
                            className="text-white/50 hover:text-white hover:bg-white/5"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => window.open(gen.result_url, '_blank')}
                            className="text-white/50 hover:text-white hover:bg-white/5"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRegenerate(gen)}
                            className="text-white/50 hover:text-white hover:bg-white/5"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(gen.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
