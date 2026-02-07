'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ArrowLeft, Sparkles, RotateCcw, Download, ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';
import { useCreditsStore } from '@/stores/credits-store';
import { LoginDialog } from '@/components/auth/login-dialog';
import { toast } from 'sonner';
import { computePrice } from '@/lib/pricing/pricing';

// Quality options with pricing
const QUALITY_OPTIONS = [
  { value: '2k', label: '2K', description: 'До 2048px', price: computePrice('topaz-image-upscale', { quality: '2k' }).stars },
  { value: '4k', label: '4K', description: 'До 4096px', price: computePrice('topaz-image-upscale', { quality: '4k' }).stars },
  { value: '8k', label: '8K', description: 'До 8192px', price: computePrice('topaz-image-upscale', { quality: '8k' }).stars },
];

export default function UpscalePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { balance, fetchBalance } = useCreditsStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<string>('2k');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const currentQuality = QUALITY_OPTIONS.find(q => q.value === selectedQuality) || QUALITY_OPTIONS[0];

  // Handle file upload
  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Пожалуйста, загрузите изображение');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target?.result as string);
      setUploadedFile(file);
      setResultImage(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Drag & Drop
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileSelect(file);
  };

  // Handle upscale
  const handleUpscale = async () => {
    if (!user) {
      setShowLoginDialog(true);
      return;
    }

    if (!uploadedFile) {
      toast.error('Сначала загрузите изображение');
      return;
    }

    if (balance < currentQuality.price) {
      toast.error(`Недостаточно звёзд. Нужно ${currentQuality.price}⭐`);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(uploadedFile);
      });

      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'topaz-image-upscale',
          prompt: 'upscale and enhance image quality',
          quality: selectedQuality,
          mode: 'i2i',
          referenceImage: base64,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Ошибка при обработке');
      }

      const data = await response.json();
      
      // Poll for result
      if (data.jobId) {
        const result = await pollForResult(data.jobId);
        if (result?.url) {
          setResultImage(result.url);
          toast.success('Изображение улучшено!');
          fetchBalance();
        }
      } else if (data.url) {
        setResultImage(data.url);
        toast.success('Изображение улучшено!');
        fetchBalance();
      }
    } catch (error: any) {
      console.error('Upscale error:', error);
      toast.error(error.message || 'Ошибка при обработке изображения');
    } finally {
      setIsProcessing(false);
    }
  };

  // Poll for result
  const pollForResult = async (jobId: string): Promise<any> => {
    const maxAttempts = 60;
    const interval = 3000;
    
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, interval));
      
      try {
        const response = await fetch(`/api/generate/status?jobId=${jobId}`);
        const data = await response.json();
        
        if (data.status === 'completed' && data.url) {
          return data;
        } else if (data.status === 'failed') {
          throw new Error(data.error || 'Генерация не удалась');
        }
      } catch (error) {
        console.error('Poll error:', error);
      }
    }
    
    throw new Error('Превышено время ожидания');
  };

  // Reset
  const handleReset = () => {
    setUploadedImage(null);
    setUploadedFile(null);
    setResultImage(null);
  };

  // Download result
  const handleDownload = async () => {
    if (!resultImage) return;
    
    try {
      const response = await fetch(resultImage);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upscaled-${selectedQuality}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Ошибка при скачивании');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <button
          onClick={() => router.push('/create/studio?section=photo')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm">Назад</span>
        </button>
        
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
              <span className="text-sm text-gray-400">Баланс:</span>
              <span className="text-sm font-medium text-[#B8FF2D]">{balance}⭐</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {!uploadedImage ? (
            // Upload State
            <motion.div
              key="upload"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center"
            >
              {/* Preview Image */}
              <div className="relative mb-8">
                <div className="w-64 h-80 rounded-2xl overflow-hidden border-2 border-dashed border-white/10 bg-white/5 flex items-center justify-center">
                  <div className="text-center p-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-white/5 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-gray-500" />
                    </div>
                    <p className="text-sm text-gray-500">Перетащите изображение</p>
                  </div>
                </div>
                
                {/* Comparison slider indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                  <span className="text-xs font-bold text-black">‹ ›</span>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl font-bold text-white mb-3 tracking-tight">UPSCALE</h1>
              <p className="text-gray-400 mb-8 text-center max-w-md">
                Загрузите изображение для улучшения качества и увеличения разрешения до 8K
              </p>

              {/* Upload Button */}
              <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={cn(
                  "relative",
                  isDragging && "scale-105"
                )}
              >
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "flex items-center gap-3 px-8 py-4 rounded-xl font-medium transition-all",
                    "bg-white text-black hover:bg-gray-100",
                    isDragging && "ring-4 ring-[#B8FF2D] ring-opacity-50"
                  )}
                >
                  <Upload className="w-5 h-5" />
                  <span>Загрузить изображение</span>
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleInputChange}
                className="hidden"
              />
            </motion.div>
          ) : (
            // Editor State
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-8 max-w-6xl w-full"
            >
              {/* Image Preview */}
              <div className="flex-1 flex items-center justify-center">
                <div className="relative">
                  {/* Add new image button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -left-16 top-1/2 -translate-y-1/2 w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors"
                  >
                    <span className="text-2xl text-gray-400">+</span>
                  </button>

                  {/* Image */}
                  <div className="relative rounded-2xl overflow-hidden bg-black/50 border border-white/10">
                    <img
                      src={resultImage || uploadedImage}
                      alt="Preview"
                      className="max-w-[600px] max-h-[70vh] object-contain"
                    />
                    
                    {/* Upscale button overlay */}
                    {!isProcessing && !resultImage && (
                      <button
                        onClick={handleUpscale}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-black font-medium hover:bg-gray-100 transition-colors shadow-xl"
                      >
                        <Sparkles className="w-4 h-4" />
                        <span>Upscale</span>
                      </button>
                    )}

                    {/* Processing overlay */}
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-12 h-12 border-4 border-[#B8FF2D] border-t-transparent rounded-full animate-spin" />
                          <p className="text-white font-medium">Обработка...</p>
                        </div>
                      </div>
                    )}

                    {/* Result badge */}
                    {resultImage && (
                      <div className="absolute top-4 left-4 px-3 py-1.5 rounded-lg bg-[#B8FF2D] text-black text-sm font-medium">
                        ✓ Готово • {selectedQuality.toUpperCase()}
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleInputChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Settings Panel */}
              <div className="w-80 flex-shrink-0">
                <div className="bg-[#12121a] rounded-2xl border border-white/10 p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-[#B8FF2D]" />
                      Upscale
                    </h2>
                    <button
                      onClick={handleReset}
                      className="p-2 rounded-lg hover:bg-white/5 transition-colors"
                      title="Сбросить"
                    >
                      <RotateCcw className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  {/* Model */}
                  <div className="mb-6">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                      Модель
                    </label>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
                        <span className="text-white font-bold text-xs">T</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">Topaz</p>
                        <p className="text-xs text-gray-500">Профессиональный апскейл</p>
                      </div>
                    </div>
                  </div>

                  {/* Quality */}
                  <div className="mb-6">
                    <label className="text-xs text-gray-500 uppercase tracking-wider mb-2 block">
                      Качество
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setShowQualityMenu(!showQualityMenu)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-white font-medium">{currentQuality.label}</span>
                          <span className="text-xs text-gray-500">{currentQuality.description}</span>
                        </div>
                        <ChevronDown className={cn(
                          "w-4 h-4 text-gray-400 transition-transform",
                          showQualityMenu && "rotate-180"
                        )} />
                      </button>

                      <AnimatePresence>
                        {showQualityMenu && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 right-0 mt-2 p-2 rounded-xl bg-[#1a1a2e] border border-white/10 shadow-xl z-10"
                          >
                            {QUALITY_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                onClick={() => {
                                  setSelectedQuality(option.value);
                                  setShowQualityMenu(false);
                                }}
                                className={cn(
                                  "w-full flex items-center justify-between p-3 rounded-lg transition-colors",
                                  selectedQuality === option.value
                                    ? "bg-[#B8FF2D]/10 text-[#B8FF2D]"
                                    : "hover:bg-white/5 text-white"
                                )}
                              >
                                <div className="flex items-center gap-3">
                                  <span className="font-medium">{option.label}</span>
                                  <span className="text-xs text-gray-500">{option.description}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm">{option.price}⭐</span>
                                  {selectedQuality === option.value && (
                                    <Check className="w-4 h-4" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Price info */}
                  <div className="mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Стоимость</span>
                      <span className="text-white font-medium">{currentQuality.price}⭐</span>
                    </div>
                  </div>

                  {/* Action Button */}
                  {resultImage ? (
                    <button
                      onClick={handleDownload}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-[#B8FF2D] text-black font-semibold hover:bg-[#a8ef1d] transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      <span>Скачать результат</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleUpscale}
                      disabled={isProcessing}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-colors",
                        isProcessing
                          ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                          : "bg-[#B8FF2D] text-black hover:bg-[#a8ef1d]"
                      )}
                    >
                      <Sparkles className="w-5 h-5" />
                      <span>{isProcessing ? 'Обработка...' : `Upscale • ${currentQuality.price}⭐`}</span>
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Login Dialog */}
      <LoginDialog isOpen={showLoginDialog} onClose={() => setShowLoginDialog(false)} />
    </div>
  );
}
