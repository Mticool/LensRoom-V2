'use client';

import { useState, useCallback, useMemo } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

export function GeneratorV2Clean() {
  // All state at the top
  const [mode] = useState<'photo' | 'video' | 'ecom'>('photo');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('flux-1.1-pro');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);

  // Memoized values
  const isPromptValid = useMemo(() => {
    return prompt.trim().length >= 3;
  }, [prompt]);

  const cost = useMemo(() => {
    const costs: Record<string, number> = {
      'flux-1.1-pro': 4,
      'flux-dev': 2,
      'midjourney-v7': 8,
    };
    return costs[model] || 4;
  }, [model]);

  // Callbacks
  const handlePromptChange = useCallback((value: string) => {
    setPrompt(value);
  }, []);

  const handleModelChange = useCallback((value: string) => {
    setModel(value);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!isPromptValid || isGenerating) return;

    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          settings: {
            width: 1024,
            height: 1024,
            steps: 30,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Ошибка генерации');
      }

      const data = await response.json();

      // Poll for result
      let attempts = 0;
      const maxAttempts = 60;
      
      const pollResult = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          throw new Error('Превышено время ожидания');
        }

        const jobResponse = await fetch(`/api/jobs/${data.jobId}`);
        const jobData = await jobResponse.json();

        if (jobData.status === 'completed' || jobData.status === 'success') {
          setResult({
            id: data.jobId,
            url: jobData.result?.url || jobData.url,
            prompt: prompt.trim(),
            createdAt: new Date().toISOString(),
          });
          setIsGenerating(false);
          toast.success('Изображение готово!');
          return;
        }

        if (jobData.status === 'failed') {
          throw new Error(jobData.error || 'Генерация не удалась');
        }

        attempts++;
        await new Promise(resolve => setTimeout(resolve, 2000));
        return pollResult();
      };

      await pollResult();

    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Ошибка генерации');
      setIsGenerating(false);
      setResult(null);
    }
  }, [isPromptValid, isGenerating, prompt, model]);

  // Render
  return (
    <div className="h-[calc(100vh-64px)] w-screen flex bg-[#0F0F10] text-white overflow-hidden mt-16">
      {/* Left Panel - Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Canvas Header */}
        <div className="h-14 border-b border-gray-800 flex items-center px-6">
          <Sparkles className="w-5 h-5 text-cyan-400 mr-2" />
          <span className="font-semibold">Холст</span>
        </div>

        {/* Canvas Content */}
        <div className="flex-1 flex items-center justify-center p-8">
          {isGenerating ? (
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-lg font-medium">Генерация...</p>
              <p className="text-sm text-gray-400 mt-2">Это может занять до 60 секунд</p>
            </div>
          ) : result ? (
            <div className="max-w-2xl w-full">
              <img
                src={result.url}
                alt={result.prompt}
                className="w-full rounded-lg shadow-2xl"
              />
              <p className="text-sm text-gray-400 mt-4">{result.prompt}</p>
            </div>
          ) : (
            <div className="text-center">
              <Wand2 className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <p className="text-xl font-medium text-gray-400">Введите промпт</p>
              <p className="text-sm text-gray-500 mt-2">Опишите что хотите создать</p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Controls */}
      <div className="w-96 border-l border-gray-800 flex flex-col">
        {/* Panel Header */}
        <div className="h-14 border-b border-gray-800 flex items-center px-6">
          <span className="font-semibold">Настройки</span>
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Промпт
            </label>
            <textarea
              value={prompt}
              onChange={(e) => handlePromptChange(e.target.value)}
              placeholder="Опишите изображение..."
              disabled={isGenerating}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400 resize-none"
            />
            <p className="text-xs text-gray-500 mt-1">
              Минимум 3 символа
            </p>
          </div>

          {/* Model */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Модель
            </label>
            <select
              value={model}
              onChange={(e) => handleModelChange(e.target.value)}
              disabled={isGenerating}
              className="w-full px-4 py-3 rounded-lg bg-gray-900 border border-gray-700 text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="flux-1.1-pro">Flux 1.1 Pro (4⭐)</option>
              <option value="flux-dev">Flux Dev (2⭐)</option>
              <option value="midjourney-v7">Midjourney v7 (8⭐)</option>
            </select>
          </div>

          {/* Cost */}
          <div className="p-4 rounded-lg bg-gray-900 border border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Стоимость</span>
              <span className="text-lg font-bold text-cyan-400">{cost}⭐</span>
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div className="p-6 border-t border-gray-800">
          <Button
            onClick={handleGenerate}
            disabled={!isPromptValid || isGenerating}
            className="w-full h-12 bg-cyan-400 hover:bg-cyan-500 text-black font-semibold text-base disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin mr-2" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Создать ({cost}⭐)
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}


