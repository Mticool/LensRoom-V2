'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { getAllKieModels, getKieModel, KIE_DEFAULTS } from '@/config/kieModels';
import { toast } from 'sonner';

interface TestGeneratorProps {
  kind: 'image' | 'video';
}

interface GenerationStatus {
  taskId: string;
  model: string;
  status: 'creating' | 'polling' | 'success' | 'failed';
  attempts: number;
  resultUrls?: string[];
  error?: string;
}

export function TestGenerator({ kind }: TestGeneratorProps) {
  const [generating, setGenerating] = useState(false);
  const [status, setStatus] = useState<GenerationStatus | null>(null);

  // Get available models for this kind
  const availableModels = getAllKieModels().filter(m => m.kind === kind);

  const handleTestGenerate = async (modelKey: string) => {
    try {
      setGenerating(true);
      setStatus({
        taskId: '',
        model: modelKey,
        status: 'creating',
        attempts: 0,
      });

      const model = getKieModel(modelKey);
      if (!model) {
        throw new Error(`Model ${modelKey} not found`);
      }

      // Prepare test input based on model
      let testInput: Record<string, unknown> = {
        prompt: kind === 'image' 
          ? 'A beautiful sunset over mountains, high quality, detailed' 
          : 'A serene mountain landscape with flowing river, cinematic',
      };

      // Add model-specific parameters
      if (model.mode === 't2i') {
        testInput = {
          ...testInput,
          aspectRatio: '16:9',
        };

        if (modelKey === 'flux2_pro_t2i') {
          testInput.resolution = '2K';
        }

        if (modelKey === 'seedream_45_t2i') {
          testInput.steps = 30;
          testInput.guidanceScale = 7.5;
        }
      }

      if (model.mode === 't2v') {
        testInput = {
          ...testInput,
          duration: 5,
          aspectRatio: '16:9',
        };

        if (modelKey === 'kling_26_t2v') {
          testInput.sound = false;
        }
      }

      if (model.mode === 'i2v') {
        toast.error('Image-to-video requires image upload (not implemented in test UI)');
        return;
      }

      console.log('[TestGenerator] Creating task:', { modelKey, testInput });

      // 1. Create task
      const createResponse = await fetch('/api/kie/createTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelKey,
          prompt: testInput.prompt,
          options: testInput,
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.json();
        throw new Error(error.error || 'Failed to create task');
      }

      const createData = await createResponse.json();
      const taskId = createData.taskId;

      console.log('[TestGenerator] Task created:', taskId);

      setStatus(prev => prev ? {
        ...prev,
        taskId,
        status: 'polling',
      } : null);

      toast.info(`Task ${taskId} created, polling...`);

      // 2. Start polling
      let attempts = 0;
      const maxAttempts = KIE_DEFAULTS.maxPollingAttempts;
      const interval = KIE_DEFAULTS.pollingInterval;

      const poll = async (): Promise<void> => {
        attempts++;
        
        setStatus(prev => prev ? { ...prev, attempts } : null);

        console.log(`[TestGenerator] Polling attempt ${attempts}/${maxAttempts}`);

        const recordResponse = await fetch(`/api/kie/recordInfo?taskId=${taskId}`);
        
        if (!recordResponse.ok) {
          throw new Error('Failed to fetch record info');
        }

        const recordData = await recordResponse.json();
        const state = recordData.data?.state;

        console.log(`[TestGenerator] State: ${state}`);

        if (state === 'success') {
          // Parse results
          let resultUrls: string[] = [];
          
          if (recordData.data.resultJson) {
            try {
              const parsed = JSON.parse(recordData.data.resultJson);
              
              if (parsed.outputs && Array.isArray(parsed.outputs)) {
                resultUrls = parsed.outputs;
              } else if (parsed.resultUrls && Array.isArray(parsed.resultUrls)) {
                resultUrls = parsed.resultUrls;
              } else if (Array.isArray(parsed)) {
                resultUrls = parsed;
              } else if (typeof parsed === 'string') {
                resultUrls = [parsed];
              }
            } catch (e) {
              console.error('[TestGenerator] Failed to parse resultJson:', e);
              resultUrls = [recordData.data.resultJson];
            }
          }

          console.log('[TestGenerator] Success! Results:', resultUrls);

          setStatus(prev => prev ? {
            ...prev,
            status: 'success',
            resultUrls,
          } : null);

          toast.success(`Generation complete! ${resultUrls.length} result(s)`);
          return;
        }

        if (state === 'fail') {
          const failMsg = recordData.data?.failMsg || 'Generation failed';
          console.error('[TestGenerator] Failed:', failMsg);

          setStatus(prev => prev ? {
            ...prev,
            status: 'failed',
            error: failMsg,
          } : null);

          toast.error(`Generation failed: ${failMsg}`);
          return;
        }

        // Still processing
        if (attempts >= maxAttempts) {
          throw new Error('Polling timeout');
        }

        // Continue polling
        await new Promise(resolve => setTimeout(resolve, interval));
        await poll();
      };

      await poll();

    } catch (error) {
      console.error('[TestGenerator] Error:', error);
      
      const message = error instanceof Error ? error.message : 'Unknown error';
      
      setStatus(prev => prev ? {
        ...prev,
        status: 'failed',
        error: message,
      } : null);

      toast.error(message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 border-2 border-dashed border-[var(--border)] rounded-lg bg-[var(--surface)]">
      <h3 className="text-lg font-semibold text-[var(--text)] mb-4">
        🧪 KIE.ai Test Generator ({kind})
      </h3>

      <div className="space-y-4 mb-6">
        {availableModels.map(model => (
          <div key={model.id} className="flex items-center gap-3">
            <Button
              onClick={() => handleTestGenerate(model.id)}
              disabled={generating}
              className="min-w-[200px]"
              variant={model.requiresPremium ? 'outline' : 'default'}
            >
              {generating && status?.model === model.id ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {status.status === 'creating' ? 'Creating...' : `Polling (${status.attempts})...`}
                </>
              ) : (
                <>
                  Test {model.name}
                  {model.requiresPremium && ' 👑'}
                </>
              )}
            </Button>
            
            <span className="text-sm text-[var(--muted)]">
              {model.starsCost}⭐ · {model.mode.toUpperCase()}
            </span>

            {model.requiresPremium && (
              <span className="text-xs text-[var(--gold)] bg-[var(--gold)]/10 px-2 py-1 rounded">
                Requires Premium
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Status Display */}
      {status && (
        <div className="mt-6 p-4 rounded-lg bg-[var(--surface2)]">
          <div className="flex items-center gap-2 mb-2">
            {status.status === 'creating' && <Clock className="w-5 h-5 text-blue-500" />}
            {status.status === 'polling' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
            {status.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
            {status.status === 'failed' && <XCircle className="w-5 h-5 text-red-500" />}
            
            <span className="font-semibold text-[var(--text)]">
              {status.status.charAt(0).toUpperCase() + status.status.slice(1)}
            </span>
          </div>

          {status.taskId && (
            <p className="text-sm text-[var(--muted)] mb-2">
              Task ID: <code className="text-xs bg-[var(--bg)] px-2 py-1 rounded">{status.taskId}</code>
            </p>
          )}

          {status.status === 'polling' && (
            <p className="text-sm text-[var(--text2)]">
              Polling attempt {status.attempts}/{KIE_DEFAULTS.maxPollingAttempts}...
            </p>
          )}

          {status.status === 'success' && status.resultUrls && (
            <div className="mt-3 space-y-2">
              <p className="text-sm font-medium text-[var(--text)]">
                ✅ Results ({status.resultUrls.length}):
              </p>
              {status.resultUrls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <a 
                    href={url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-[var(--gold)] hover:underline truncate max-w-[400px]"
                  >
                    Result {i + 1}
                  </a>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => window.open(url, '_blank')}
                  >
                    Open
                  </Button>
                </div>
              ))}

              <p className="text-xs text-[var(--muted)] mt-3">
                💡 Check your library at <a href="/library" className="text-[var(--gold)] hover:underline">/library</a> to see if it was saved to database.
              </p>
            </div>
          )}

          {status.status === 'failed' && status.error && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded">
              <p className="text-sm text-red-400">
                ❌ Error: {status.error}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 text-xs text-[var(--muted)] space-y-1">
        <p>📌 This is a test UI to verify KIE.ai integration.</p>
        <p>• Creates a task with test prompt</p>
        <p>• Polls every 3s for up to 3 minutes</p>
        <p>• Shows result URLs when ready</p>
        <p>• Saves to database via callback or manual poll</p>
      </div>
    </div>
  );
}


