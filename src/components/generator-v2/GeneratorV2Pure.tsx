'use client';

import { useState, useCallback, useMemo } from 'react';

interface GenerationResult {
  id: string;
  url: string;
  prompt: string;
  createdAt: string;
}

export function GeneratorV2Pure() {
  // All state at the top - NEVER conditional
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('flux-1.1-pro');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Memoized values - computed from state
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

  // All callbacks wrapped in useCallback
  const handlePromptChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPrompt(e.target.value);
  }, []);

  const handleModelChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!isPromptValid || isGenerating) return;

    setIsGenerating(true);
    setResult(null);
    setError(null);

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
        const errorData = await response.json();
        throw new Error(errorData.message || 'Ошибка генерации');
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

    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Ошибка генерации');
      setIsGenerating(false);
      setResult(null);
    }
  }, [isPromptValid, isGenerating, prompt, model]);

  // Pure render - no external components
  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      display: 'flex',
      backgroundColor: '#0F0F10',
      color: 'white',
      overflow: 'hidden',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* Left Panel - Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Canvas Header */}
        <div style={{
          height: '56px',
          borderBottom: '1px solid #1F1F23',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px'
        }}>
          <span style={{ fontWeight: 600 }}>🎨 Холст</span>
        </div>

        {/* Canvas Content */}
        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px'
        }}>
          {isGenerating ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: '64px',
                height: '64px',
                border: '4px solid #22D3EE',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ fontSize: '18px', fontWeight: 500 }}>Генерация...</p>
              <p style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '8px' }}>
                Это может занять до 60 секунд
              </p>
            </div>
          ) : result ? (
            <div style={{ maxWidth: '672px', width: '100%' }}>
              <img
                src={result.url}
                alt={result.prompt}
                style={{
                  width: '100%',
                  borderRadius: '8px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
              />
              <p style={{ fontSize: '14px', color: '#9CA3AF', marginTop: '16px' }}>
                {result.prompt}
              </p>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '80px', marginBottom: '16px' }}>✨</div>
              <p style={{ fontSize: '20px', fontWeight: 500, color: '#9CA3AF' }}>
                Введите промпт
              </p>
              <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '8px' }}>
                Опишите что хотите создать
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Controls */}
      <div style={{
        width: '384px',
        borderLeft: '1px solid #1F1F23',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Panel Header */}
        <div style={{
          height: '56px',
          borderBottom: '1px solid #1F1F23',
          display: 'flex',
          alignItems: 'center',
          padding: '0 24px'
        }}>
          <span style={{ fontWeight: 600 }}>⚙️ Настройки</span>
        </div>

        {/* Panel Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}>
          {/* Error Message */}
          {error && (
            <div style={{
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: '#7F1D1D',
              border: '1px solid #991B1B',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          {/* Prompt */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px'
            }}>
              Промпт
            </label>
            <textarea
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Опишите изображение..."
              disabled={isGenerating}
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#18181B',
                border: '1px solid #27272A',
                color: 'white',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                opacity: isGenerating ? 0.5 : 1
              }}
            />
            <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>
              Минимум 3 символа
            </p>
          </div>

          {/* Model */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: 500,
              marginBottom: '8px'
            }}>
              Модель
            </label>
            <select
              value={model}
              onChange={handleModelChange}
              disabled={isGenerating}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                backgroundColor: '#18181B',
                border: '1px solid #27272A',
                color: 'white',
                fontSize: '14px',
                outline: 'none',
                opacity: isGenerating ? 0.5 : 1
              }}
            >
              <option value="flux-1.1-pro">Flux 1.1 Pro (4⭐)</option>
              <option value="flux-dev">Flux Dev (2⭐)</option>
              <option value="midjourney-v7">Midjourney v7 (8⭐)</option>
            </select>
          </div>

          {/* Cost */}
          <div style={{
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: '#18181B',
            border: '1px solid #27272A'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ fontSize: '14px', color: '#9CA3AF' }}>Стоимость</span>
              <span style={{ fontSize: '18px', fontWeight: 700, color: '#22D3EE' }}>
                {cost}⭐
              </span>
            </div>
          </div>
        </div>

        {/* Panel Footer */}
        <div style={{
          padding: '24px',
          borderTop: '1px solid #1F1F23'
        }}>
          <button
            onClick={handleGenerate}
            disabled={!isPromptValid || isGenerating}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: (!isPromptValid || isGenerating) ? '#115E67' : '#22D3EE',
              color: 'black',
              fontWeight: 600,
              fontSize: '16px',
              borderRadius: '8px',
              border: 'none',
              cursor: (!isPromptValid || isGenerating) ? 'not-allowed' : 'pointer',
              opacity: (!isPromptValid || isGenerating) ? 0.5 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {isGenerating ? (
              <>
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid black',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                Генерация...
              </>
            ) : (
              <>
                ✨ Создать ({cost}⭐)
              </>
            )}
          </button>
        </div>
      </div>

      {/* Inline keyframes for spin animation */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}




