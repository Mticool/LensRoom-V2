'use client';

import { useState, useEffect } from 'react';
import { X, Check, Loader2, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GenerationResult } from './GeneratorV2';
import { toast } from 'sonner';

function normalizeAspectRatio(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "1:1";
  const m = raw.match(/^(\d+)\s*[:/.\sx×]\s*(\d+)$/i);
  if (!m) return raw;
  const w = Number(m[1]);
  const h = Number(m[2]);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return raw;
  return `${w}:${h}`;
}

interface HistoryImagePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (images: { preview: string; id: string }[]) => void;
  maxSelect?: number;
  mode: 'image' | 'video';
}

export function HistoryImagePicker({ 
  isOpen, 
  onClose, 
  onSelect, 
  maxSelect = 10,
  mode 
}: HistoryImagePickerProps) {
  const [history, setHistory] = useState<GenerationResult[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Загрузка истории
  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, mode]);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const type = mode === 'video' ? 'video' : 'photo';
      const response = await fetch(`/api/generations?type=${type}&limit=50&status=success`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch history');
      }

      const data = await response.json();
      
      // Transform API response
      const results: GenerationResult[] = (data.generations || [])
        .filter((gen: any) => gen.status === 'success' && (gen.result_urls?.[0] || gen.asset_url))
        .map((gen: any) => ({
          id: gen.id,
          url: gen.result_urls?.[0] || gen.asset_url || '',
          prompt: gen.prompt || '',
          mode: gen.type === 'video' ? 'video' : 'image',
          settings: {
            model: gen.model_id || '',
            size: normalizeAspectRatio(gen.aspect_ratio),
          },
          timestamp: new Date(gen.created_at).getTime(),
          previewUrl: gen.preview_url || gen.result_urls?.[0] || gen.asset_url || '',
          status: gen.status,
        }));

      setHistory(results);
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch history:', error);
      }
      toast.error('Не удалось загрузить историю');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selected);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      if (newSelected.size >= maxSelect) {
        toast.error(`Максимум ${maxSelect} изображений`);
        return;
      }
      newSelected.add(id);
    }
    setSelected(newSelected);
  };

  const handleConfirm = () => {
    const selectedImages = history
      .filter(item => selected.has(item.id))
      .map(item => ({
        preview: item.previewUrl || item.url,
        id: item.id,
      }));

    if (selectedImages.length === 0) {
      toast.error('Выберите хотя бы одно изображение');
      return;
    }

    onSelect(selectedImages);
    setSelected(new Set());
    onClose();
  };

  const handleClose = () => {
    setSelected(new Set());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-[#18181B] rounded-2xl border border-[#27272A] w-full max-w-4xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#27272A]">
          <div>
            <h3 className="text-lg font-semibold text-white">Выбрать из истории</h3>
            <p className="text-sm text-[#71717A] mt-0.5">
              {selected.size > 0 
                ? `Выбрано ${selected.size} из ${maxSelect}`
                : `Выберите до ${maxSelect} изображений`
              }
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-[#27272A] text-[#71717A] hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-[#8cf425] animate-spin mb-3" />
              <p className="text-sm text-[#71717A]">Загрузка истории...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 rounded-2xl bg-[#27272A] flex items-center justify-center mb-3">
                <ImageIcon className="w-8 h-8 text-[#71717A]" />
              </div>
              <p className="text-sm text-[#71717A]">История пуста</p>
              <p className="text-xs text-[#52525B] mt-1">Сгенерируйте изображения для выбора</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {history.map((item) => {
                const isSelected = selected.has(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleSelect(item.id)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all group",
                      isSelected 
                        ? "border-[#8cf425] ring-2 ring-[#8cf425]/20 scale-95" 
                        : "border-transparent hover:border-[#3F3F46]"
                    )}
                  >
                    <img
                      src={item.previewUrl || item.url}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                    />
                    
                    {/* Overlay */}
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-t from-black/60 to-transparent transition-opacity",
                      isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                    )}>
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-xs text-white line-clamp-2">
                          {item.prompt}
                        </p>
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div className={cn(
                      "absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all",
                      isSelected 
                        ? "bg-[#8cf425] scale-100" 
                        : "bg-[#27272A]/80 scale-0 group-hover:scale-100"
                    )}>
                      {isSelected && <Check className="w-4 h-4 text-[#0F0F10]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-[#27272A]">
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-white text-sm font-medium transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleConfirm}
            disabled={selected.size === 0}
            className="px-6 py-2 rounded-lg bg-[#8cf425] hover:bg-[#22D3EE] text-[#0F0F10] text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Выбрать ({selected.size})
          </button>
        </div>
      </div>
    </div>
  );
}









