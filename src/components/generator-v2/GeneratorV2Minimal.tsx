'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

export function GeneratorV2Minimal() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setResult(null);
    
    // Simulate generation
    setTimeout(() => {
      setResult('https://via.placeholder.com/512');
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-[#0F0F10] text-white">
      {/* Header */}
      <div className="h-12 border-b border-gray-700 bg-gray-900 flex items-center px-4">
        <Sparkles className="w-4 h-4 text-cyan-400 mr-2" />
        <span className="text-sm font-semibold">LensRoom Minimal Test</span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        {isGenerating ? (
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-cyan-400 animate-spin mx-auto mb-4" />
            <p>Генерация...</p>
          </div>
        ) : result ? (
          <div className="text-center">
            <img src={result} alt="Result" className="max-w-md rounded-lg mb-4" />
            <p className="text-sm text-gray-400">{prompt}</p>
          </div>
        ) : (
          <div className="text-center">
            <Sparkles className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
            <p className="text-lg mb-2">Введите промпт</p>
            <p className="text-sm text-gray-400">Это минимальный тест</p>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 bg-gray-900">
        <div className="max-w-2xl mx-auto flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите изображение..."
            disabled={isGenerating}
            className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder:text-gray-500 focus:outline-none focus:border-cyan-400"
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating}
            className="px-6 py-3 rounded-lg bg-cyan-400 hover:bg-cyan-500 text-black font-semibold disabled:opacity-50"
          >
            {isGenerating ? 'Генерация...' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  );
}

