'use client';

import { useState } from 'react';

type Mode = 'photo' | 'video';

interface Result {
  url: string;
  prompt: string;
}

export default function StudioPage() {
  const [mode, setMode] = useState<Mode>('photo');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('flux-1.1-pro');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const photoModels = [
    { id: 'flux-1.1-pro', name: 'Flux 1.1 Pro', cost: 4 },
    { id: 'flux-dev', name: 'Flux Dev', cost: 2 },
    { id: 'midjourney-v7', name: 'Midjourney v7', cost: 8 },
    { id: 'nano-banana', name: 'Nano Banana', cost: 3 },
  ];

  const videoModels = [
    { id: 'veo-3.1', name: 'Veo 3.1', cost: 20 },
    { id: 'kling-2.1', name: 'Kling 2.1', cost: 15 },
    { id: 'sora-2', name: 'Sora 2', cost: 25 },
  ];

  const models = mode === 'photo' ? photoModels : videoModels;
  const currentModel = models.find(m => m.id === model) || models[0];

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const endpoint = mode === 'photo' ? '/api/generate/photo' : '/api/generate/video';
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          aspectRatio: '1:1',
          quality: 'turbo',
          mode: 't2i',
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Ошибка генерации');
      }

      // Poll for result
      const jobId = data.jobId || data.taskId;
      if (jobId) {
        let attempts = 0;
        while (attempts < 60) {
          await new Promise(r => setTimeout(r, 2000));
          
          const pollRes = await fetch(`/api/jobs/${jobId}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'completed' || pollData.status === 'success') {
            const url = pollData.result?.url || pollData.url || pollData.imageUrl;
            if (url) {
              setResult({ url, prompt: prompt.trim() });
              break;
            }
          }

          if (pollData.status === 'failed') {
            throw new Error(pollData.error || 'Генерация не удалась');
          }

          attempts++;
        }

        if (attempts >= 60) {
          throw new Error('Таймаут ожидания');
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
    }}>
      {/* Left: Canvas */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        {isGenerating ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 64,
              height: 64,
              border: '4px solid #22d3ee',
              borderTopColor: 'transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
            }} />
            <p style={{ fontSize: 18 }}>Генерация...</p>
            <p style={{ color: '#888', marginTop: 8 }}>До 60 секунд</p>
          </div>
        ) : result ? (
          <div style={{ maxWidth: 600 }}>
            {mode === 'video' ? (
              <video src={result.url} controls style={{ width: '100%', borderRadius: 12 }} />
            ) : (
              <img src={result.url} alt="" style={{ width: '100%', borderRadius: 12 }} />
            )}
            <p style={{ color: '#888', marginTop: 12, fontSize: 14 }}>{result.prompt}</p>
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>✨</div>
            <p style={{ fontSize: 20, color: '#888' }}>Введите промпт справа</p>
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div style={{
        width: 380,
        background: '#111',
        borderLeft: '1px solid #222',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}>
        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => { setMode('photo'); setModel(photoModels[0].id); }}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'photo' ? '#22d3ee' : '#222',
              color: mode === 'photo' ? 'black' : 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🖼️ Фото
          </button>
          <button
            onClick={() => { setMode('video'); setModel(videoModels[0].id); }}
            style={{
              flex: 1,
              padding: '12px',
              background: mode === 'video' ? '#22d3ee' : '#222',
              color: mode === 'video' ? 'black' : 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🎬 Видео
          </button>
        </div>

        {/* Prompt */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: '#888', fontSize: 14 }}>
            Промпт
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Опишите что хотите создать..."
            rows={4}
            style={{
              width: '100%',
              padding: 12,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
              fontSize: 14,
              resize: 'none',
            }}
          />
        </div>

        {/* Model */}
        <div>
          <label style={{ display: 'block', marginBottom: 8, color: '#888', fontSize: 14 }}>
            Модель
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={{
              width: '100%',
              padding: 12,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
              fontSize: 14,
            }}
          >
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name} ({m.cost}⭐)</option>
            ))}
          </select>
        </div>

        {/* Cost */}
        <div style={{
          padding: 16,
          background: '#1a1a1a',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
        }}>
          <span style={{ color: '#888' }}>Стоимость</span>
          <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 18 }}>
            {currentModel.cost}⭐
          </span>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: 12,
            background: '#7f1d1d',
            borderRadius: 8,
            fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          style={{
            padding: 16,
            background: (!prompt.trim() || isGenerating) ? '#115e67' : '#22d3ee',
            color: 'black',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: (!prompt.trim() || isGenerating) ? 'not-allowed' : 'pointer',
            opacity: (!prompt.trim() || isGenerating) ? 0.5 : 1,
          }}
        >
          {isGenerating ? '⏳ Генерация...' : `✨ Создать (${currentModel.cost}⭐)`}
        </button>

        {/* Back Link */}
        <a
          href="/"
          style={{
            textAlign: 'center',
            color: '#888',
            fontSize: 14,
            textDecoration: 'none',
          }}
        >
          ← На главную
        </a>
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

