'use client';

import { useState } from 'react';
import { Canvas } from './Canvas';
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { GeneratorMode, GenerationSettings, GenerationResult } from './GeneratorV2';

export function GeneratorV2Simple() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    setIsGenerating(true);
    setResult(null);

    try {
      const response = await fetch('/api/generate/photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: 'nano-banana',
          aspectRatio: '1:1',
          mode: 't2i',
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Ошибка');
      }

      // Poll for result
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        if (attempts > 60) {
          clearInterval(pollInterval);
          toast.error('Таймаут');
          setIsGenerating(false);
          return;
        }

        try {
          const jobRes = await fetch(`/api/jobs/${data.jobId}?provider=${data.provider || 'kie_market'}`);
          const jobData = await jobRes.json();

          if (jobData.status === 'completed' || jobData.status === 'success') {
            clearInterval(pollInterval);
            const url = jobData.results?.[0]?.url || jobData.url || '';
            setResult({
              id: data.generationId,
              url,
              prompt,
              mode: 'image',
              settings: { model: 'nano-banana', size: '1:1' },
              timestamp: Date.now(),
            });
            setIsGenerating(false);
            toast.success('Готово!');
          } else if (jobData.status === 'failed') {
            clearInterval(pollInterval);
            toast.error('Ошибка генерации');
            setIsGenerating(false);
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 1000);

    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ошибка');
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-[calc(100vh-64px)] w-screen flex flex-col bg-[#0F0F10] mt-16">
      {/* Header */}
      <div className="h-12 border-b border-[#27272A] bg-[#18181B] flex items-center px-4">
        <Sparkles className="w-4 h-4 text-[#00D9FF] mr-2" />
        <span className="text-sm font-semibold text-white">LensRoom Test</span>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <Canvas
          result={result}
          isGenerating={isGenerating}
          mode="image"
          onExampleClick={setPrompt}
        />
      </div>

      {/* Prompt */}
      <div className="p-4 bg-[#0F0F10]">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            placeholder="Опишите изображение..."
            disabled={isGenerating}
            className="flex-1 px-4 py-3 rounded-lg bg-[#18181B] border border-[#27272A] text-white placeholder:text-[#52525B] focus:outline-none focus:border-[#00D9FF]"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="px-6 py-3 rounded-lg bg-[#00D9FF] hover:bg-[#22D3EE] text-black font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Генерация...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Создать
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


