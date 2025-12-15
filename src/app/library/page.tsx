"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CardSkeleton } from "@/components/ui/loading";
import { Image as ImageIcon, Video, Download, Star, Clock, Loader2, AlertCircle, PlayCircle, Eye } from "lucide-react";
import { useAuth } from "@/providers/auth-provider";
import { useTelegramAuth } from "@/providers/telegram-auth-provider";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

type Generation = {
  id: string;
  kind: 'image' | 'video';
  status: 'queued' | 'generating' | 'success' | 'failed';
  model_key: string;
  prompt: string;
  asset_url?: string;
  result_urls?: string[] | string;
  preview_url?: string;
  error?: string;
  created_at: string;
  updated_at?: string;
};

export default function LibraryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'image' | 'video'>('all');
  const [selectedItem, setSelectedItem] = useState<Generation | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  const supabaseAuth = useAuth();
  const telegramAuth = useTelegramAuth();
  const user = supabaseAuth.user || telegramAuth.user;

  useEffect(() => {
    if (user) {
      fetchGenerations();
    } else {
      setIsLoading(false);
    }
  }, [user, filter]);

  const fetchGenerations = async () => {
    try {
      setIsLoading(true);
      const supabase = getSupabaseBrowserClient();
      
      let query = supabase
        .from('generations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'all') {
        query = query.eq('kind', filter);
      }

      const { data, error } = await query;

      if (error) throw error;

      setGenerations(data || []);
    } catch (error) {
      console.error('Error fetching generations:', error);
      toast.error('Ошибка загрузки результатов');
    } finally {
      setIsLoading(false);
    }
  };

  const getImageUrl = (gen: Generation): string | null => {
    if (gen.asset_url) return gen.asset_url;
    if (gen.preview_url) return gen.preview_url;
    
    if (gen.result_urls) {
      try {
        const urls = typeof gen.result_urls === 'string' 
          ? JSON.parse(gen.result_urls) 
          : gen.result_urls;
        return Array.isArray(urls) ? urls[0] : urls;
      } catch (e) {
        console.error('Error parsing result_urls:', e);
      }
    }
    
    return null;
  };

  const handleOpenItem = (gen: Generation) => {
    setSelectedItem(gen);
    setModalOpen(true);
  };

  const filteredGenerations = generations.filter(gen => {
    if (filter === 'all') return true;
    return gen.kind === filter;
  });

  if (!user) {
    return (
      <div className="min-h-screen pt-24 pb-20 bg-[var(--bg)] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[var(--text)] mb-2">Войдите в аккаунт</h2>
          <p className="text-[var(--text2)] mb-6">
            Для просмотра библиотеки результатов необходимо авторизоваться
          </p>
          <Button onClick={() => window.location.href = '/'} variant="default">
            На главную
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[var(--bg)]">
      <motion.div
        className="container mx-auto px-4 lg:px-8 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
            Мои <span className="text-[var(--gold)]">результаты</span>
          </h1>
          <p className="text-xl text-[var(--text2)]">
            Все ваши генерации в одном месте
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          className="flex gap-2 mb-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Button
            variant={filter === 'all' ? 'default' : 'secondary'}
            onClick={() => setFilter('all')}
            size="sm"
          >
            Все
          </Button>
          <Button
            variant={filter === 'image' ? 'default' : 'secondary'}
            onClick={() => setFilter('image')}
            size="sm"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            Фото
          </Button>
          <Button
            variant={filter === 'video' ? 'default' : 'secondary'}
            onClick={() => setFilter('video')}
            size="sm"
          >
            <Video className="w-4 h-4 mr-2" />
            Видео
          </Button>
        </motion.div>

        {/* Results count */}
        <div className="mb-6 text-sm text-[var(--muted)]">
          {isLoading ? "Загрузка..." : `Всего: ${filteredGenerations.length} результатов`}
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          /* Results Grid */
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredGenerations.map((gen) => {
              const imageUrl = getImageUrl(gen);
              const isProcessing = gen.status === 'generating' || gen.status === 'queued';
              const isFailed = gen.status === 'failed';

              return (
                <motion.div
                  key={gen.id}
                  variants={item}
                  onClick={() => handleOpenItem(gen)}
                >
                  <Card
                    variant="hover"
                    className="group overflow-hidden cursor-pointer hover:shadow-[0_0_30px_var(--gold-glow)] transition-all duration-300 p-0 h-full"
                  >
                    {/* Preview Image/Video */}
                    <div className="relative aspect-square overflow-hidden bg-[var(--surface2)]">
                      {imageUrl && !isProcessing && !isFailed ? (
                        <>
                          <img
                            src={imageUrl}
                            alt={gen.prompt}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {gen.kind === 'video' && (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
                                <PlayCircle className="w-8 h-8 text-white" />
                              </div>
                            </div>
                          )}
                        </>
                      ) : isProcessing ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <Loader2 className="w-12 h-12 text-[var(--gold)] animate-spin mb-3" />
                          <p className="text-sm text-[var(--text2)]">
                            {gen.status === 'queued' ? 'В очереди...' : 'Генерация...'}
                          </p>
                        </div>
                      ) : isFailed ? (
                        <div className="w-full h-full flex flex-col items-center justify-center">
                          <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                          <p className="text-sm text-red-400">Ошибка</p>
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {gen.kind === 'video' ? (
                            <Video className="w-12 h-12 text-[var(--muted)]" />
                          ) : (
                            <ImageIcon className="w-12 h-12 text-[var(--muted)]" />
                          )}
                        </div>
                      )}

                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <Badge
                          className={cn(
                            "font-bold px-2 py-1",
                            gen.status === 'success'
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : gen.status === 'failed'
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-[var(--gold)]/20 text-[var(--gold)] border-[var(--gold)]/30"
                          )}
                        >
                          {gen.kind === 'video' ? <Video className="w-3 h-3 mr-1" /> : <ImageIcon className="w-3 h-3 mr-1" />}
                          {gen.kind === 'video' ? 'Видео' : 'Фото'}
                        </Badge>
                      </div>

                      {/* Hover overlay */}
                      {!isProcessing && !isFailed && (
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          <span className="text-white font-semibold bg-black/60 px-4 py-2 rounded-lg flex items-center gap-2">
                            <Eye className="w-4 h-4" />
                            Открыть
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 bg-[var(--surface)]">
                      <h3 className="text-sm font-semibold text-[var(--text)] mb-2 line-clamp-1">
                        {gen.model_key || 'Неизвестная модель'}
                      </h3>
                      <p className="text-xs text-[var(--text2)] mb-3 line-clamp-2">
                        {gen.prompt || 'Без описания'}
                      </p>

                      {/* Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                        <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                          <Clock className="w-3 h-3" />
                          <span>
                            {new Date(gen.created_at).toLocaleDateString('ru-RU', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                        {gen.status === 'success' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (imageUrl) {
                                const a = document.createElement('a');
                                a.href = imageUrl;
                                a.download = `${gen.kind}_${gen.id}.${gen.kind === 'video' ? 'mp4' : 'png'}`;
                                a.click();
                              }
                            }}
                          >
                            <Download className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && filteredGenerations.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-[var(--surface2)] flex items-center justify-center mx-auto mb-4">
              {filter === 'video' ? (
                <Video className="w-10 h-10 text-[var(--muted)]" />
              ) : filter === 'image' ? (
                <ImageIcon className="w-10 h-10 text-[var(--muted)]" />
              ) : (
                <Star className="w-10 h-10 text-[var(--muted)]" />
              )}
            </div>
            <p className="text-[var(--text2)] text-lg mb-2">
              {filter === 'all' ? 'Пока нет результатов' : 
               filter === 'video' ? 'Нет видео' : 'Нет фото'}
            </p>
            <p className="text-[var(--muted)] mb-6">
              Создайте свою первую генерацию
            </p>
            <Button onClick={() => window.location.href = filter === 'video' ? '/create/video' : '/create'}>
              Создать {filter === 'video' ? 'видео' : 'фото'}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      {modalOpen && selectedItem && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative max-w-5xl w-full bg-[var(--surface)] rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
            >
              ×
            </button>

            {selectedItem.kind === 'video' ? (
              <video
                src={getImageUrl(selectedItem) || undefined}
                controls
                autoPlay
                className="w-full"
              />
            ) : (
              <img
                src={getImageUrl(selectedItem) || ''}
                alt={selectedItem.prompt}
                className="w-full"
              />
            )}

            <div className="p-6 border-t border-[var(--border)]">
              <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                {selectedItem.model_key}
              </h3>
              <p className="text-sm text-[var(--text2)] mb-4">
                {selectedItem.prompt}
              </p>
              <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(selectedItem.created_at).toLocaleDateString('ru-RU', {
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
