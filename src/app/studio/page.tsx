'use client';

import { useState, useMemo } from 'react';
import { PHOTO_MODELS, VIDEO_MODELS, getModelById } from '@/config/models';
import { computePrice } from '@/lib/pricing/compute-price';

type Mode = 'photo' | 'video';

interface Result {
  url: string;
  prompt: string;
  model: string;
  mode: Mode;
}

export default function StudioPage() {
  const [mode, setMode] = useState<Mode>('photo');
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('nano-banana');
  const [quality, setQuality] = useState('turbo');
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get available models based on mode
  const availableModels = useMemo(() => {
    if (mode === 'photo') {
      return PHOTO_MODELS.filter(m => m.featured || m.rank <= 10).map(m => ({
        id: m.id,
        name: m.name,
        description: m.shortDescription || m.description,
        qualityOptions: m.qualityOptions,
      }));
    } else {
      return VIDEO_MODELS.filter(m => m.featured || m.rank <= 10).map(m => ({
        id: m.id,
        name: m.name,
        description: m.description?.slice(0, 60) + '...',
        qualityOptions: m.qualityOptions,
        durationOptions: m.durationOptions,
      }));
    }
  }, [mode]);

  // Calculate price
  const price = useMemo(() => {
    const options: any = {};
    if (mode === 'video') {
      options.duration = duration;
      options.videoQuality = quality;
    } else {
      options.quality = quality;
    }
    return computePrice(model, options);
  }, [model, mode, quality, duration]);

  // Get current model info
  const currentModel = useMemo(() => {
    return getModelById(model);
  }, [model]);

  // Handle mode change
  const handleModeChange = (newMode: Mode) => {
    setMode(newMode);
    if (newMode === 'photo') {
      setModel('nano-banana');
      setQuality('turbo');
    } else {
      setModel('veo-3.1');
      setQuality('fast');
      setDuration(8);
    }
  };

  // Handle model change
  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    const modelInfo = getModelById(newModel);
    if (modelInfo) {
      if (modelInfo.type === 'video') {
        const vm = modelInfo as any;
        if (vm.qualityOptions?.length) setQuality(vm.qualityOptions[0]);
        if (vm.durationOptions?.length) setDuration(vm.durationOptions[0] as number);
      } else {
        const pm = modelInfo as any;
        if (pm.qualityOptions?.length) setQuality(pm.qualityOptions[0]);
      }
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const endpoint = mode === 'photo' ? '/api/generate/photo' : '/api/generate/video';
      
      const body: any = {
        prompt: prompt.trim(),
        model,
        aspectRatio: '16:9',
        mode: 't2i',
      };

      if (mode === 'video') {
        body.mode = 't2v';
        body.duration = duration;
        body.quality = quality;
      } else {
        body.quality = quality;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Ошибка генерации');
      }

      // Poll for result
      const jobId = data.jobId || data.taskId;
      if (jobId) {
        let attempts = 0;
        while (attempts < 120) {
          await new Promise(r => setTimeout(r, 2000));
          
          const pollRes = await fetch(`/api/jobs/${jobId}`);
          const pollData = await pollRes.json();

          if (pollData.status === 'completed' || pollData.status === 'success') {
            const url = pollData.result?.url || pollData.url || pollData.imageUrl || pollData.results?.[0]?.url;
            if (url) {
              const newResult: Result = {
                url,
                prompt: prompt.trim(),
                model,
                mode,
              };
              setResults(prev => [newResult, ...prev]);
              // Clear prompt for next generation
              setPrompt('');
              break;
            }
          }

          if (pollData.status === 'failed') {
            throw new Error(pollData.error || 'Генерация не удалась');
          }

          attempts++;
        }

        if (attempts >= 120) {
          throw new Error('Таймаут ожидания');
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setIsGenerating(false);
    }
  };

  const latestResult = results[0];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0a0a0b',
      color: 'white',
      fontFamily: 'system-ui, sans-serif',
      display: 'flex',
    }}>
      {/* Left: Canvas + History */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Main Canvas */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
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
              <p style={{ fontSize: 18 }}>Генерация {mode === 'video' ? 'видео' : 'фото'}...</p>
              <p style={{ color: '#888', marginTop: 8 }}>
                {mode === 'video' ? 'До 2-3 минут' : 'До 60 секунд'}
              </p>
            </div>
          ) : latestResult ? (
            <div style={{ maxWidth: 700, width: '100%' }}>
              {latestResult.mode === 'video' ? (
                <video 
                  src={latestResult.url} 
                  controls 
                  autoPlay
                  style={{ width: '100%', borderRadius: 12, background: '#111' }} 
                />
              ) : (
                <img 
                  src={latestResult.url} 
                  alt="" 
                  style={{ width: '100%', borderRadius: 12 }} 
                />
              )}
              <div style={{ 
                marginTop: 12, 
                padding: 12, 
                background: '#111', 
                borderRadius: 8,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <div>
                  <p style={{ color: '#888', fontSize: 14, marginBottom: 4 }}>{latestResult.prompt}</p>
                  <p style={{ color: '#555', fontSize: 12 }}>{latestResult.model}</p>
                </div>
                <a 
                  href={latestResult.url} 
                  download 
                  target="_blank"
                  style={{
                    padding: '8px 16px',
                    background: '#22d3ee',
                    color: 'black',
                    borderRadius: 6,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  ⬇️ Скачать
                </a>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 64, marginBottom: 16 }}>✨</div>
              <p style={{ fontSize: 20, color: '#888' }}>Введите промпт справа</p>
              <p style={{ fontSize: 14, color: '#555', marginTop: 8 }}>
                Результат появится здесь
              </p>
            </div>
          )}
        </div>

        {/* History Strip */}
        {results.length > 1 && (
          <div style={{
            padding: '12px 24px',
            borderTop: '1px solid #222',
            display: 'flex',
            gap: 12,
            overflowX: 'auto',
          }}>
            {results.slice(1, 10).map((r, i) => (
              <div 
                key={i}
                onClick={() => setResults([r, ...results.filter((_, idx) => idx !== i + 1)])}
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: 8,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2px solid transparent',
                  flexShrink: 0,
                }}
              >
                {r.mode === 'video' ? (
                  <video src={r.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <img src={r.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Controls */}
      <div style={{
        width: 400,
        background: '#111',
        borderLeft: '1px solid #222',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        overflowY: 'auto',
      }}>
        {/* Mode Toggle */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handleModeChange('photo')}
            style={{
              flex: 1,
              padding: '14px',
              background: mode === 'photo' ? '#22d3ee' : '#222',
              color: mode === 'photo' ? 'black' : 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            🖼️ Фото
          </button>
          <button
            onClick={() => handleModeChange('video')}
            style={{
              flex: 1,
              padding: '14px',
              background: mode === 'video' ? '#22d3ee' : '#222',
              color: mode === 'video' ? 'black' : 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 15,
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
              padding: 14,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
              fontSize: 15,
              resize: 'none',
              lineHeight: 1.5,
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
            onChange={(e) => handleModelChange(e.target.value)}
            style={{
              width: '100%',
              padding: 14,
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: 8,
              color: 'white',
              fontSize: 15,
            }}
          >
            {availableModels.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          {currentModel && (
            <p style={{ color: '#555', fontSize: 12, marginTop: 6 }}>
              {currentModel.description?.slice(0, 80)}...
            </p>
          )}
        </div>

        {/* Quality (if available) */}
        {currentModel && 'qualityOptions' in currentModel && currentModel.qualityOptions && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#888', fontSize: 14 }}>
              Качество
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {currentModel.qualityOptions.map((q: string) => (
                <button
                  key={q}
                  onClick={() => setQuality(q)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: quality === q ? '#22d3ee' : '#222',
                    color: quality === q ? 'black' : 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Duration (video only) */}
        {mode === 'video' && currentModel && 'durationOptions' in currentModel && currentModel.durationOptions && (
          <div>
            <label style={{ display: 'block', marginBottom: 8, color: '#888', fontSize: 14 }}>
              Длительность
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(currentModel as any).durationOptions.map((d: number | string) => (
                <button
                  key={d}
                  onClick={() => setDuration(typeof d === 'number' ? d : 5)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    background: duration === d ? '#22d3ee' : '#222',
                    color: duration === d ? 'black' : 'white',
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  {d} сек
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cost */}
        <div style={{
          padding: 16,
          background: '#1a1a1a',
          borderRadius: 8,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span style={{ color: '#888' }}>Стоимость</span>
          <div style={{ textAlign: 'right' }}>
            <span style={{ color: '#22d3ee', fontWeight: 700, fontSize: 22 }}>
              {price.stars}⭐
            </span>
            <span style={{ color: '#555', fontSize: 12, marginLeft: 8 }}>
              ≈{price.approxRub}₽
            </span>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            padding: 12,
            background: '#7f1d1d',
            borderRadius: 8,
            fontSize: 14,
          }}>
            ❌ {error}
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating}
          style={{
            padding: 18,
            background: (!prompt.trim() || isGenerating) ? '#115e67' : '#22d3ee',
            color: 'black',
            border: 'none',
            borderRadius: 8,
            fontSize: 17,
            fontWeight: 700,
            cursor: (!prompt.trim() || isGenerating) ? 'not-allowed' : 'pointer',
            opacity: (!prompt.trim() || isGenerating) ? 0.5 : 1,
          }}
        >
          {isGenerating ? '⏳ Генерация...' : `✨ Создать (${price.stars}⭐)`}
        </button>

        {/* Results count */}
        {results.length > 0 && (
          <p style={{ textAlign: 'center', color: '#555', fontSize: 13 }}>
            Создано: {results.length} {results.length === 1 ? 'результат' : 'результатов'}
          </p>
        )}

        {/* Back Link */}
        <a
          href="/"
          style={{
            textAlign: 'center',
            color: '#888',
            fontSize: 14,
            textDecoration: 'none',
            marginTop: 'auto',
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
