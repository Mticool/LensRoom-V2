'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Star, 
  Eye, 
  EyeOff, 
  Loader2, 
  Upload,
  GripVertical,
  Image as ImageIcon,
  Video,
  Package
} from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

interface ShowcaseCard {
  id: string;
  title: string;
  description: string;
  prompt: string;
  model: string;
  type: string;
  result_url: string;
  thumbnail_url: string;
  category: string;
  tags: string[];
  is_featured: boolean;
  is_active: boolean;
  order_index: number;
  created_at: string;
}

export default function ShowcaseManager() {
  const [cards, setCards] = useState<ShowcaseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCard, setEditingCard] = useState<ShowcaseCard | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    prompt: '',
    model: '',
    type: 'image',
    result_url: '',
    category: '',
    tags: '',
    is_featured: false,
  });

  useEffect(() => {
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('showcase_cards')
        .select('*')
        .order('order_index', { ascending: true });

      if (error) throw error;

      setCards(data || []);
    } catch (error) {
      console.error('Error fetching showcase cards:', error);
      toast.error('Ошибка загрузки карточек');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        toast.error('Не авторизован');
        return;
      }

      const cardData = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        created_by: user.id,
        order_index: cards.length,
      };

      if (editingCard) {
        // Update
        const { error } = await supabase
          .from('showcase_cards')
          .update(cardData)
          .eq('id', editingCard.id);

        if (error) throw error;
        toast.success('Карточка обновлена');
      } else {
        // Create
        const { error } = await supabase
          .from('showcase_cards')
          .insert(cardData);

        if (error) throw error;
        toast.success('Карточка создана');
      }

      setShowForm(false);
      setEditingCard(null);
      resetForm();
      fetchCards();

    } catch (error: any) {
      console.error('Error saving card:', error);
      toast.error(error.message || 'Ошибка сохранения');
    }
  };

  const handleEdit = (card: ShowcaseCard) => {
    setEditingCard(card);
    setFormData({
      title: card.title,
      description: card.description || '',
      prompt: card.prompt,
      model: card.model,
      type: card.type,
      result_url: card.result_url,
      category: card.category || '',
      tags: card.tags?.join(', ') || '',
      is_featured: card.is_featured,
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить эту карточку?')) return;

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('showcase_cards')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Карточка удалена');
      fetchCards();
    } catch (error) {
      console.error('Error deleting card:', error);
      toast.error('Ошибка удаления');
    }
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('showcase_cards')
        .update({ is_active: !isActive })
        .eq('id', id);

      if (error) throw error;

      toast.success(isActive ? 'Карточка скрыта' : 'Карточка активна');
      fetchCards();
    } catch (error) {
      console.error('Error toggling active:', error);
      toast.error('Ошибка');
    }
  };

  const toggleFeatured = async (id: string, isFeatured: boolean) => {
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('showcase_cards')
        .update({ is_featured: !isFeatured })
        .eq('id', id);

      if (error) throw error;

      toast.success(isFeatured ? 'Убрано из Featured' : 'Добавлено в Featured');
      fetchCards();
    } catch (error) {
      console.error('Error toggling featured:', error);
      toast.error('Ошибка');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      prompt: '',
      model: '',
      type: 'image',
      result_url: '',
      category: '',
      tags: '',
      is_featured: false,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image': return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case 'video': return <Video className="w-4 h-4 text-purple-400" />;
      case 'product': return <Package className="w-4 h-4 text-green-400" />;
      default: return <ImageIcon className="w-4 h-4 text-white/40" />;
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Showcase Manager
          </h1>
          <p className="text-white/50">
            Управление карточками на главной странице
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCard(null);
            resetForm();
            setShowForm(true);
          }}
          className="bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Добавить карточку
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="p-4 bg-white/5 border-white/10">
          <p className="text-sm text-white/50">Всего</p>
          <p className="text-2xl font-bold text-white">{cards.length}</p>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <p className="text-sm text-white/50">Активных</p>
          <p className="text-2xl font-bold text-emerald-400">
            {cards.filter(c => c.is_active).length}
          </p>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <p className="text-sm text-white/50">Featured</p>
          <p className="text-2xl font-bold text-[#c8ff00]">
            {cards.filter(c => c.is_featured).length}
          </p>
        </Card>
        <Card className="p-4 bg-white/5 border-white/10">
          <p className="text-sm text-white/50">Видео</p>
          <p className="text-2xl font-bold text-purple-400">
            {cards.filter(c => c.type === 'video').length}
          </p>
        </Card>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#111] rounded-2xl border border-white/10 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            >
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingCard ? 'Редактировать' : 'Создать'} карточку
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Название
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00]"
                    required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Описание
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00] resize-none"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    Промпт (что было сгенерировано)
                  </label>
                  <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00] resize-none"
                    rows={3}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">
                      Модель
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      placeholder="flux-2, sora-2, veo-3.1..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00]"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">
                      Тип
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00]"
                    >
                      <option value="image">Фото</option>
                      <option value="video">Видео</option>
                      <option value="product">Продукт</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-white/70 mb-2 block">
                    URL результата
                  </label>
                  <input
                    type="url"
                    value={formData.result_url}
                    onChange={(e) => setFormData({ ...formData, result_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">
                      Категория
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Продукты, Люди, Природа..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00]"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-white/70 mb-2 block">
                      Теги (через запятую)
                    </label>
                    <input
                      type="text"
                      value={formData.tags}
                      onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                      placeholder="фотореализм, арт, 4k..."
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[#c8ff00]/50 focus:border-[#c8ff00]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={formData.is_featured}
                    onChange={(e) => setFormData({ ...formData, is_featured: e.target.checked })}
                    className="w-5 h-5 rounded border-white/20 bg-white/5 text-[#c8ff00] focus:ring-[#c8ff00] focus:ring-offset-0"
                  />
                  <label htmlFor="featured" className="text-sm text-white">
                    <span className="font-medium">Featured</span>
                    <span className="text-white/50 ml-1">— показывать в топе галереи</span>
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit" 
                    className="flex-1 bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
                  >
                    {editingCard ? 'Обновить' : 'Создать'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowForm(false);
                      setEditingCard(null);
                      resetForm();
                    }}
                    className="border-white/10 text-white hover:bg-white/5"
                  >
                    Отмена
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, index) => (
          <Card 
            key={card.id} 
            className={`overflow-hidden bg-white/5 border-white/10 ${!card.is_active ? 'opacity-50' : ''}`}
          >
            <div className="aspect-square bg-black/50 relative group">
              {card.type === 'video' ? (
                <video
                  src={card.result_url}
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
                  src={card.result_url}
                  alt={card.title}
                  className="w-full h-full object-cover"
                />
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

              {/* Badges */}
              <div className="absolute top-3 left-3 flex gap-2">
                {card.is_featured && (
                  <div className="px-2 py-1 rounded-lg bg-[#c8ff00] text-black text-xs font-medium flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Featured
                  </div>
                )}
                <div className="px-2 py-1 rounded-lg bg-black/50 backdrop-blur text-white text-xs font-medium flex items-center gap-1">
                  {getTypeIcon(card.type)}
                  <span className="capitalize">{card.type}</span>
                </div>
              </div>

              {/* Order */}
              <div className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center">
                <span className="text-xs text-white font-medium">#{index + 1}</span>
              </div>
            </div>

            <div className="p-4">
              <h3 className="font-semibold text-white mb-1 line-clamp-1">
                {card.title}
              </h3>
              {card.description && (
                <p className="text-sm text-white/50 mb-2 line-clamp-2">
                  {card.description}
                </p>
              )}
              <div className="flex items-center gap-2 text-xs text-white/40 mb-4">
                <span className="px-2 py-0.5 rounded bg-white/5">{card.model}</span>
                {card.category && (
                  <span className="px-2 py-0.5 rounded bg-white/5">{card.category}</span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(card)}
                  className="flex-1 border-white/10 text-white hover:bg-white/5"
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Изменить
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleActive(card.id, card.is_active)}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  {card.is_active ? (
                    <Eye className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <EyeOff className="w-4 h-4 text-white/40" />
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleFeatured(card.id, card.is_featured)}
                  className="border-white/10 text-white hover:bg-white/5"
                >
                  <Star className={`w-4 h-4 ${card.is_featured ? 'fill-[#c8ff00] text-[#c8ff00]' : 'text-white/40'}`} />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDelete(card.id)}
                  className="border-white/10 text-red-400 hover:bg-red-500/10 hover:border-red-500/30"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {cards.length === 0 && (
        <Card className="p-12 text-center bg-white/5 border-white/10">
          <Upload className="w-16 h-16 text-white/20 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            Нет карточек
          </h3>
          <p className="text-white/50 mb-6">
            Создайте первую карточку для showcase галереи
          </p>
          <Button 
            onClick={() => setShowForm(true)}
            className="bg-[#c8ff00] text-black hover:bg-[#b8ef00]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Создать карточку
          </Button>
        </Card>
      )}
    </div>
  );
}
