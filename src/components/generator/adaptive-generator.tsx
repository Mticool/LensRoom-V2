'use client';

import { useState } from 'react';
import { getModelById, hasFeature } from '@/lib/models-config';
import { FirstLastFrame } from './features/first-last-frame';
import { CharacterReference } from './features/character-reference';
import { StyleReference } from './features/style-reference';
import { MotionBrush } from './features/motion-brush';
import { CameraControl } from './features/camera-control';
import { AspectRatioSelector } from './features/aspect-ratio-selector';
import { Storyboard } from './features/storyboard';
import { ImageToImage } from './features/image-to-image';
import { AudioSync } from './features/audio-sync';
import { Button } from '@/components/ui/button';
import { Sparkles, Zap, Star, Info } from 'lucide-react';

interface GenerationParams {
  firstFrame?: File | null;
  lastFrame?: File | null;
  characterRefs?: File[];
  styleRef?: File | null;
  sourceImage?: File | null;
  audioFile?: File | null;
  motionAreas?: unknown[];
  camera?: { movement: string; speed: number };
  scenes?: { id: string; prompt: string; duration: number }[];
}

interface AdaptiveGeneratorProps {
  modelId: string;
  onGenerate: (params: {
    modelId: string;
    prompt: string;
    aspectRatio: string;
  } & GenerationParams) => void;
}

export function AdaptiveGenerator({ modelId, onGenerate }: AdaptiveGeneratorProps) {
  const model = getModelById(modelId);
  
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generationParams, setGenerationParams] = useState<GenerationParams>({});

  if (!model) {
    return (
      <div className="flex items-center justify-center h-64 text-white/40">
        Модель не найдена
      </div>
    );
  }

  const handleGenerate = () => {
    onGenerate({
      modelId,
      prompt,
      aspectRatio,
      ...generationParams,
    });
  };

  const accentColor = '#c8ff00';

  return (
    <div className="space-y-5">
      {/* Model Info */}
      <div className="p-4 rounded-xl border bg-[#c8ff00]/5 border-[#c8ff00]/20">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 bg-[#c8ff00]/10">
              <Info className="w-5 h-5" style={{ color: accentColor }} />
            </div>
            <div>
              <h3 className="font-semibold text-white mb-1">{model.name}</h3>
              <p className="text-sm text-white/50">{model.description}</p>
              {/* Badges */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {model.quality === 'ultra' && (
                  <span className="text-[10px] px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-0.5 border border-amber-500/20">
                    <Star className="w-2.5 h-2.5 fill-amber-400" />ULTRA
                  </span>
                )}
                {model.speed === 'fast' && (
                  <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center gap-0.5 border border-emerald-500/20">
                    <Zap className="w-2.5 h-2.5" />FAST
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold" style={{ color: accentColor }}>
              {model.credits}
            </div>
            <div className="text-xs text-white/30">кредитов</div>
          </div>
        </div>
      </div>

      {/* Main Prompt */}
      <div>
        <label className="text-sm font-medium text-white/70 mb-2 block">
          Описание {model.type === 'image' ? 'изображения' : 'видео'}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={`Опишите что вы хотите создать...`}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl 
                   text-white placeholder:text-white/30
                   resize-none focus:outline-none focus:border-[#c8ff00]/50 transition-colors"
          rows={4}
        />
        <div className="flex justify-between mt-2">
          <span className="text-xs text-white/30">Чем детальнее описание, тем лучше результат</span>
          <span className="text-xs text-white/30">{prompt.length} символов</span>
        </div>
      </div>

      {/* Aspect Ratio */}
      {hasFeature(modelId, 'aspect-ratio') && model.aspectRatios && (
        <AspectRatioSelector
          ratios={model.aspectRatios}
          selected={aspectRatio}
          onChange={setAspectRatio}
        />
      )}

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Image to Image */}
        {hasFeature(modelId, 'image-to-image') && (
          <ImageToImage
            onImageChange={(file) => 
              setGenerationParams((p) => ({ ...p, sourceImage: file }))
            }
          />
        )}

        {/* First/Last Frame */}
        {hasFeature(modelId, 'first-last-frame') && (
          <FirstLastFrame
            onFirstFrameChange={(file) => 
              setGenerationParams((p) => ({ ...p, firstFrame: file }))
            }
            onLastFrameChange={(file) => 
              setGenerationParams((p) => ({ ...p, lastFrame: file }))
            }
          />
        )}

        {/* Character Reference */}
        {hasFeature(modelId, 'character-reference') && (
          <CharacterReference
            onImagesChange={(files) => 
              setGenerationParams((p) => ({ ...p, characterRefs: files }))
            }
          />
        )}

        {/* Style Reference */}
        {hasFeature(modelId, 'style-reference') && (
          <StyleReference
            onImageChange={(file) => 
              setGenerationParams((p) => ({ ...p, styleRef: file }))
            }
          />
        )}
      </div>

      {/* Audio Sync - full width */}
      {hasFeature(modelId, 'audio-sync') && (
        <AudioSync
          onAudioChange={(file) => 
            setGenerationParams((p) => ({ ...p, audioFile: file }))
          }
        />
      )}

      {/* Motion Brush */}
      {hasFeature(modelId, 'motion-brush') && (
        <MotionBrush
          onMotionChange={(areas) => 
            setGenerationParams((p) => ({ ...p, motionAreas: areas }))
          }
        />
      )}

      {/* Camera Control */}
      {hasFeature(modelId, 'camera-control') && (
        <CameraControl
          onCameraChange={(settings) => 
            setGenerationParams((p) => ({ ...p, camera: settings }))
          }
        />
      )}

      {/* Storyboard */}
      {hasFeature(modelId, 'storyboard') && (
        <Storyboard
          onScenesChange={(scenes) => 
            setGenerationParams((p) => ({ ...p, scenes }))
          }
        />
      )}

      {/* Generate Button */}
      <Button
        size="lg"
        onClick={handleGenerate}
        disabled={!prompt.trim()}
        className="w-full h-14 text-base font-semibold rounded-xl transition-all bg-[#c8ff00] text-black hover:bg-[#b8ef00] disabled:bg-[#c8ff00]/30 disabled:text-black/50"
      >
        <Sparkles className="w-5 h-5 mr-2" />
        Создать {model.type === 'image' ? 'изображение' : 'видео'}
        <span className="ml-2 opacity-70">• {model.credits} кредитов</span>
      </Button>
    </div>
  );
}

