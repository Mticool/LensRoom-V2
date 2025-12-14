'use client';

import { useState, useCallback } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  Download, 
  Loader2, 
  Check, 
  AlertCircle,
  Clock,
  Play,
  X,
  Image as ImageIcon,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ACCEPTED_IMAGE_FORMATS, isHeicFile, convertHeicToJpeg } from '@/lib/image-utils';

interface BatchItem {
  id: string;
  name: string;
  image: File;
  preview?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: string;
  error?: string;
}

export function BatchProcessor() {
  const [items, setItems] = useState<BatchItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    // Skip header if present
    const dataLines = lines[0].toLowerCase().includes('name') ? lines.slice(1) : lines;
    
    console.log('CSV parsed:', dataLines.length, 'items');
    // TODO: Match CSV names with uploaded images
  };

  const handleImagesUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newItems: BatchItem[] = [];

    for (let i = 0; i < files.length; i++) {
      let file = files[i];
      
      // Convert HEIC if needed
      if (isHeicFile(file)) {
        try {
          file = await convertHeicToJpeg(file);
        } catch (error) {
          console.error('Error converting HEIC:', error);
        }
      }

      // Create preview
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      newItems.push({
        id: `${Date.now()}-${i}`,
        name: file.name.split('.')[0].replace(/_/g, ' '),
        image: file,
        preview,
        status: 'pending',
      });
    }

    setItems(prev => [...prev, ...newItems]);
    
    // Reset input
    e.target.value = '';
  }, []);

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const clearAll = () => {
    setItems([]);
  };

  const processBatch = async () => {
    if (items.length === 0) return;
    
    setProcessing(true);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.status === 'completed') continue;

      setCurrentIndex(i);
      
      // Update status to processing
      setItems(prev => prev.map((it, idx) => 
        idx === i ? { ...it, status: 'processing' } : it
      ));

      try {
        // Mock API call - replace with actual generation
        await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));
        
        // Simulate success/error randomly for demo
        const success = Math.random() > 0.1;
        
        setItems(prev => prev.map((it, idx) => 
          idx === i 
            ? { 
                ...it, 
                status: success ? 'completed' : 'error',
                result: success ? '/generated/result.jpg' : undefined,
                error: success ? undefined : 'Ошибка генерации'
              } 
            : it
        ));
      } catch (error) {
        setItems(prev => prev.map((it, idx) => 
          idx === i ? { ...it, status: 'error', error: 'Ошибка сети' } : it
        ));
      }
    }

    setProcessing(false);
    setCurrentIndex(null);
  };

  const completedCount = items.filter(i => i.status === 'completed').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const errorCount = items.filter(i => i.status === 'error').length;

  const getStatusIcon = (status: BatchItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-white/40" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-[#c8ff00] animate-spin" />;
      case 'completed':
        return <Check className="w-4 h-4 text-emerald-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getStatusText = (status: BatchItem['status'], error?: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'processing':
        return 'Обработка...';
      case 'completed':
        return 'Готово';
      case 'error':
        return error || 'Ошибка';
    }
  };

  return (
    <div className="space-y-5">
      {/* Upload Areas */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* CSV Upload */}
        <label className={cn(
          "flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer transition-all",
          "bg-white/[0.02] border border-dashed border-white/10 hover:border-[#c8ff00]/50 hover:bg-white/[0.04]"
        )}>
          <FileSpreadsheet className="w-10 h-10 text-white/30 mb-3" />
          <span className="text-sm font-medium text-white/70 mb-1">
            Загрузить CSV
          </span>
          <span className="text-xs text-white/40 text-center">
            Список товаров с названиями
          </span>
          <input 
            type="file" 
            className="hidden" 
            accept=".csv" 
            onChange={handleCSVUpload} 
          />
        </label>

        {/* Images Upload */}
        <label className={cn(
          "flex flex-col items-center justify-center p-6 rounded-xl cursor-pointer transition-all",
          "bg-white/[0.02] border border-dashed border-white/10 hover:border-[#c8ff00]/50 hover:bg-white/[0.04]"
        )}>
          <Upload className="w-10 h-10 text-white/30 mb-3" />
          <span className="text-sm font-medium text-white/70 mb-1">
            Загрузить фото
          </span>
          <span className="text-xs text-white/40 text-center">
            Выберите несколько файлов
          </span>
          <input 
            type="file" 
            className="hidden" 
            accept={ACCEPTED_IMAGE_FORMATS}
            multiple 
            onChange={handleImagesUpload} 
          />
        </label>
      </div>

      {/* Items List */}
      {items.length > 0 && (
        <>
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-sm font-medium text-white">
                Товары ({items.length})
              </h3>
              {/* Stats */}
              <div className="flex items-center gap-3 text-xs">
                {completedCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3" /> {completedCount}
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 text-white/40">
                    <Clock className="w-3 h-3" /> {pendingCount}
                  </span>
                )}
                {errorCount > 0 && (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-3 h-3" /> {errorCount}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="text-xs text-white/40 hover:text-red-400 transition-colors"
              >
                Очистить все
              </button>
              <Button
                onClick={processBatch}
                disabled={processing || pendingCount === 0}
                className="bg-[#c8ff00] text-black hover:bg-[#b8ef00] disabled:bg-[#c8ff00]/30 disabled:text-black/50"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {currentIndex !== null && `${currentIndex + 1}/${items.length}`}
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Обработать ({pendingCount})
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Items Grid */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {items.map((item, index) => (
              <div 
                key={item.id} 
                className={cn(
                  "flex items-center gap-4 p-3 rounded-xl transition-all",
                  "bg-white/[0.02] border border-white/10",
                  item.status === 'processing' && "border-[#c8ff00]/30 bg-[#c8ff00]/5",
                  item.status === 'completed' && "border-emerald-500/30",
                  item.status === 'error' && "border-red-500/30"
                )}
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-white/5 overflow-hidden shrink-0">
                  {item.preview ? (
                    <img 
                      src={item.preview} 
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-white/20" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {item.name}
                  </p>
                  <p className={cn(
                    "text-xs flex items-center gap-1.5 mt-0.5",
                    item.status === 'pending' && "text-white/40",
                    item.status === 'processing' && "text-[#c8ff00]",
                    item.status === 'completed' && "text-emerald-400",
                    item.status === 'error' && "text-red-400"
                  )}>
                    {getStatusIcon(item.status)}
                    {getStatusText(item.status, item.error)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.status === 'completed' && (
                    <button
                      type="button"
                      className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center
                               text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  )}
                  {!processing && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center
                               text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Export All */}
          {completedCount > 0 && (
            <Button 
              variant="outline" 
              className="w-full border-white/10 text-white/70 hover:text-white hover:bg-white/5"
            >
              <Download className="w-4 h-4 mr-2" />
              Скачать все ({completedCount} готовых)
            </Button>
          )}

          {/* Progress Bar */}
          {processing && (
            <div className="space-y-2">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#c8ff00] transition-all duration-300"
                  style={{ 
                    width: `${((items.length - pendingCount) / items.length) * 100}%` 
                  }}
                />
              </div>
              <p className="text-xs text-white/40 text-center">
                Обработано {items.length - pendingCount} из {items.length}
              </p>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {items.length === 0 && (
        <div className="text-center py-12 text-white/30">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Загрузите фото товаров для пакетной обработки</p>
        </div>
      )}
    </div>
  );
}

