'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GenerationResultProps {
  generation: {
    id: string;
    kind?: 'image' | 'video';
    status?: string;
    asset_url?: string | null;
    result_urls?: string[] | string | null;
    preview_url?: string | null;
    error?: string | null;
    task_id?: string;
  };
  onClose?: () => void;
}

/**
 * Reliable component for displaying generation results
 * 
 * Priority order:
 * 1. asset_url (Supabase Storage - guaranteed to work)
 * 2. result_urls[0] (KIE URLs - may expire)
 * 3. preview_url (legacy fallback)
 * 
 * Status handling:
 * - queued/generating: Show spinner + polling
 * - success: Show image/video
 * - failed: Show error message
 */
export function GenerationResult({ generation, onClose }: GenerationResultProps) {
  const [loading, setLoading] = useState(false);
  const [displayUrl, setDisplayUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    resolveDisplayUrl();
  }, [generation]);

  // Auto-polling for generating status
  useEffect(() => {
    if (generation.status === 'generating' || generation.status === 'queued') {
      const interval = setInterval(() => {
        pollStatus();
      }, 3000); // Poll every 3 seconds

      return () => clearInterval(interval);
    }
  }, [generation.status, pollingCount]);

  const resolveDisplayUrl = async () => {
    try {
      // 1. Try asset_url first (Supabase Storage - most reliable)
      if (generation.asset_url) {
        console.log('[GenerationResult] Using asset_url:', generation.asset_url);
        setDisplayUrl(generation.asset_url);
        return;
      }

      // 2. Try result_urls (KIE URLs)
      if (generation.result_urls) {
        let urls: string[] = [];
        
        // Parse if string
        if (typeof generation.result_urls === 'string') {
          try {
            urls = JSON.parse(generation.result_urls);
          } catch (e) {
            urls = [generation.result_urls];
          }
        } else if (Array.isArray(generation.result_urls)) {
          urls = generation.result_urls;
        }

        if (urls.length > 0 && urls[0]) {
          console.log('[GenerationResult] Using result_urls[0]:', urls[0]);
          
          // Try to get downloadUrl for more reliable access
          try {
            const downloadResponse = await fetch('/api/kie/downloadUrl', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: urls[0] }),
            });

            if (downloadResponse.ok) {
              const { downloadUrl } = await downloadResponse.json();
              setDisplayUrl(downloadUrl);
              return;
            }
          } catch (e) {
            console.error('[GenerationResult] downloadUrl failed, using direct URL');
          }

          // Fallback to direct URL
          setDisplayUrl(urls[0]);
          return;
        }
      }

      // 3. Try preview_url (legacy)
      if (generation.preview_url) {
        console.log('[GenerationResult] Using preview_url:', generation.preview_url);
        setDisplayUrl(generation.preview_url);
        return;
      }

      // 4. No URL available - check status
      if (generation.status === 'generating' || generation.status === 'queued') {
        console.log('[GenerationResult] Still generating...');
        setError(null);
        return;
      }

      if (generation.status === 'failed') {
        console.error('[GenerationResult] Generation failed:', generation.error);
        setError(generation.error || 'Generation failed');
        return;
      }

      // No URL and status is success - this is an error
      console.error('[GenerationResult] No URL found for completed generation');
      setError('Result not available');

    } catch (err) {
      console.error('[GenerationResult] Error resolving URL:', err);
      setError('Failed to load result');
    }
  };

  const pollStatus = async () => {
    if (!generation.task_id) return;
    
    setPollingCount(prev => prev + 1);
    
    try {
      console.log(`[GenerationResult] Polling status (${pollingCount + 1})...`);
      
      const response = await fetch(`/api/kie/sync?taskId=${generation.task_id}`);
      
      if (!response.ok) {
        console.error('[GenerationResult] Poll failed:', response.status);
        return;
      }

      const data = await response.json();
      
      console.log('[GenerationResult] Poll result:', data);

      if (data.status === 'success') {
        // Refresh the component with new data
        if (data.assetUrl) {
          setDisplayUrl(data.assetUrl);
        }
        // Stop polling (status changed)
      } else if (data.status === 'failed') {
        setError(data.error || 'Generation failed');
      }
      
    } catch (err) {
      console.error('[GenerationResult] Poll error:', err);
    }
  };

  const handleDownload = () => {
    if (!displayUrl) return;
    
    const link = document.createElement('a');
    link.href = displayUrl;
    link.download = `generation-${generation.id}.${generation.kind === 'video' ? 'mp4' : 'jpg'}`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // RENDERING

  // Status: Generating
  if (generation.status === 'generating' || generation.status === 'queued') {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="w-16 h-16 text-[var(--gold)] animate-spin mb-4" />
        <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
          Генерация...
        </h3>
        <p className="text-[var(--text2)] text-center mb-4">
          Это может занять 1-5 минут
        </p>
        <div className="text-sm text-[var(--muted)]">
          Попытка {pollingCount + 1}/60
        </div>
        {generation.task_id && (
          <div className="mt-4 text-xs text-[var(--muted)] font-mono">
            Task: {generation.task_id}
          </div>
        )}
      </div>
    );
  }

  // Status: Failed
  if (generation.status === 'failed' || error) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
          Ошибка генерации
        </h3>
        <p className="text-[var(--text2)] text-center max-w-md">
          {error || generation.error || 'Неизвестная ошибка'}
        </p>
        {onClose && (
          <Button
            onClick={onClose}
            variant="outline"
            className="mt-6"
          >
            Закрыть
          </Button>
        )}
      </div>
    );
  }

  // Status: Success - No URL
  if (!displayUrl) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
        <Loader2 className="w-16 h-16 text-[var(--gold)] animate-spin mb-4" />
        <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
          Загрузка результата...
        </h3>
        <p className="text-[var(--text2)] text-center">
          Получение ссылки на файл
        </p>
      </div>
    );
  }

  // Status: Success - Display Result
  const isVideo = generation.kind === 'video' || displayUrl.includes('.mp4') || displayUrl.includes('.webm');

  return (
    <div className="relative">
      {/* Media Display */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        {isVideo ? (
          <video
            src={displayUrl}
            controls
            autoPlay
            loop
            playsInline
            className="w-full max-h-[70vh] object-contain"
            onError={(e) => {
              console.error('[GenerationResult] Video load error:', e);
              setError('Failed to load video');
            }}
          />
        ) : (
          <img
            src={displayUrl}
            alt="Generated result"
            className="w-full max-h-[70vh] object-contain"
            onError={(e) => {
              console.error('[GenerationResult] Image load error:', e);
              setError('Failed to load image');
            }}
          />
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-3 mt-4">
        <Button
          onClick={handleDownload}
          variant="default"
          className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]"
        >
          <Download className="w-4 h-4 mr-2" />
          Скачать
        </Button>
        
        <Button
          onClick={() => window.open(displayUrl, '_blank')}
          variant="outline"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Открыть в новой вкладке
        </Button>
        
        {onClose && (
          <Button
            onClick={onClose}
            variant="ghost"
          >
            Закрыть
          </Button>
        )}
      </div>

      {/* Debug Info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-4 text-xs text-[var(--muted)]">
          <summary className="cursor-pointer">Debug Info</summary>
          <pre className="mt-2 p-2 bg-[var(--surface2)] rounded overflow-auto">
            {JSON.stringify({
              id: generation.id,
              status: generation.status,
              kind: generation.kind,
              asset_url: generation.asset_url,
              result_urls: generation.result_urls,
              task_id: generation.task_id,
              displayUrl,
            }, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

