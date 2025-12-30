'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Paperclip, Send, X, Sparkles, Download, Copy, Volume2 } from 'lucide-react';
import { GenerationMetadata } from './GenerationMetadata';

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface Generation {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio';
  prompt: string;
  model: string;
  cost: number;
  duration?: string; // e.g., "5s", "2.3s"
  result?: {
    text?: string;
    imageUrl?: string;
    videoUrl?: string;
    audioUrl?: string;
  };
  timestamp: Date;
}

interface ModelInfo {
  name: string;
  provider: string;
  description: string;
  icon: any; // LucideIcon type
}

interface GeneratorCanvasProps {
  mode: 'text' | 'image' | 'video' | 'audio';
  chatHistory: ChatMessage[];
  currentModel: ModelInfo;
  currentGeneration?: Generation;
  examplePrompts?: string[];
  isGenerating: boolean;
  generationProgress: number;
  
  // Prompt bar
  prompt: string;
  onPromptChange: (value: string) => void;
  uploadedFiles: File[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile: (index: number) => void;
  onGenerate: () => void;
  maxFiles?: number;
  acceptedFileTypes?: string;
}

export function GeneratorCanvas({
  mode,
  chatHistory,
  currentModel,
  currentGeneration,
  examplePrompts = [],
  isGenerating,
  generationProgress,
  prompt,
  onPromptChange,
  uploadedFiles,
  onFileSelect,
  onRemoveFile,
  onGenerate,
  maxFiles = 4,
  acceptedFileTypes = '',
}: GeneratorCanvasProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ModelIcon = currentModel.icon;

  const handleCopyText = () => {
    if (currentGeneration?.result?.text) {
      navigator.clipboard.writeText(currentGeneration.result.text);
      // Could add a toast notification here
    }
  };

  const handleDownload = () => {
    if (!currentGeneration?.result) return;
    
    const { imageUrl, videoUrl, audioUrl } = currentGeneration.result;
    const url = imageUrl || videoUrl || audioUrl;
    
    if (url) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `generation-${Date.now()}.${mode === 'image' ? 'png' : mode === 'video' ? 'mp4' : 'mp3'}`;
      link.click();
    }
  };

  const renderGenerationResult = () => {
    if (!currentGeneration?.result) return null;

    const { text, imageUrl, videoUrl, audioUrl } = currentGeneration.result;

    return (
      <div className="space-y-4">
        {/* Generation Metadata */}
        <GenerationMetadata generation={currentGeneration} />

        {/* Prompt Display */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wide">Prompt</div>
          <p className="text-sm text-[var(--text)] leading-relaxed">{currentGeneration.prompt}</p>
        </div>

        {/* Result Display */}
        <div className="p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
          <div className="flex items-center justify-between mb-4">
            <div className="text-xs text-[var(--muted)] uppercase tracking-wide">Result</div>
            <div className="flex items-center gap-2">
              {text && (
                <button
                  onClick={handleCopyText}
                  className="p-2 rounded-lg hover:bg-[var(--surface2)] transition"
                  title="Copy text"
                >
                  <Copy className="w-4 h-4 text-[var(--muted)]" />
                </button>
              )}
              {(imageUrl || videoUrl || audioUrl) && (
                <button
                  onClick={handleDownload}
                  className="p-2 rounded-lg hover:bg-[var(--surface2)] transition"
                  title="Download"
                >
                  <Download className="w-4 h-4 text-[var(--muted)]" />
                </button>
              )}
            </div>
          </div>

          {/* Text Result */}
          {text && (
            <div className="prose prose-invert max-w-none">
              <p className="text-sm text-[var(--text)] leading-relaxed whitespace-pre-wrap">{text}</p>
            </div>
          )}

          {/* Image Result */}
          {imageUrl && (
            <div className="rounded-xl overflow-hidden bg-[var(--surface2)]">
              <img 
                src={imageUrl} 
                alt={currentGeneration.prompt} 
                className="w-full h-auto"
              />
            </div>
          )}

          {/* Video Result */}
          {videoUrl && (
            <div className="rounded-xl overflow-hidden bg-black">
              <video 
                src={videoUrl} 
                controls 
                className="w-full h-auto"
                poster={imageUrl} // Optional poster frame
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {/* Audio Result */}
          {audioUrl && (
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--surface2)]">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center">
                <Volume2 className="w-6 h-6 text-[var(--accent-primary)]" />
              </div>
              <audio 
                src={audioUrl} 
                controls 
                className="flex-1"
              >
                Your browser does not support the audio tag.
              </audio>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg)]">
      {/* Canvas Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {!currentGeneration && chatHistory.length === 0 ? (
          /* Empty State */
          <div className="h-full flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent-primary)]/20 to-[var(--accent-secondary)]/20 flex items-center justify-center mb-6 shadow-lg">
              {ModelIcon && <ModelIcon className="w-12 h-12 text-[var(--accent-primary)]" />}
            </div>
            <h1 className="text-3xl font-bold mb-3">{currentModel.name}</h1>
            <p className="text-lg text-[var(--muted)] mb-2">{currentModel.provider}</p>
            <p className="text-sm text-[var(--muted)] max-w-lg leading-relaxed">{currentModel.description}</p>

            {/* Example Prompts */}
            {examplePrompts.length > 0 && (
              <div className="grid grid-cols-1 gap-3 mt-10 w-full max-w-2xl">
                {examplePrompts.slice(0, 3).map((example, i) => (
                  <button
                    key={i}
                    onClick={() => onPromptChange(example)}
                    className="group p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent-primary)] hover:bg-[var(--surface2)] transition-all text-left"
                  >
                    <div className="flex items-start gap-3">
                      <Sparkles className="mt-1 w-5 h-5 text-[var(--muted)] group-hover:text-[var(--accent-primary)] transition flex-shrink-0" />
                      <p className="text-sm text-[var(--muted)] group-hover:text-[var(--text)] transition leading-relaxed">
                        {example}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Results or Chat History */
          <div className="max-w-5xl mx-auto pb-6">
            {/* Show current generation result if available */}
            {currentGeneration ? (
              renderGenerationResult()
            ) : (
              /* Chat History */
              <div className="space-y-6">
                {chatHistory.map((msg) => (
                  <div key={msg.id} className={cn("flex gap-4", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    <div className={cn(
                      "max-w-[75%] rounded-2xl p-5 shadow-sm",
                      msg.role === 'user'
                        ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white"
                        : "bg-[var(--surface)] border border-[var(--border)]"
                    )}>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Loading Indicator */}
            {isGenerating && (
              <div className="flex items-center gap-4 p-5 rounded-2xl bg-[var(--surface)] border border-[var(--border)] shadow-sm mt-6">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-[var(--accent-primary)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-[var(--accent-secondary)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm font-medium text-[var(--muted)]">Generating {generationProgress}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Prompt Bar - Fixed at Bottom */}
      <div className="border-t border-[var(--border)] bg-[var(--surface)] p-5">
        <div className="max-w-5xl mx-auto">
          {/* File Previews */}
          {uploadedFiles.length > 0 && (
            <div className="flex gap-2 mb-3 flex-wrap">
              {uploadedFiles.map((file, i) => (
                <div key={i} className="relative group">
                  <div className="w-20 h-20 rounded-xl bg-[var(--surface2)] border border-[var(--border)] flex items-center justify-center overflow-hidden">
                    {file.type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(file)} 
                        alt={file.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-[var(--muted)] text-center px-2 leading-tight">
                        {file.name.slice(0, 12)}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => onRemoveFile(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input Row */}
          <div className="flex gap-3 items-end">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-xl bg-[var(--surface2)] hover:bg-[var(--surface3)] border border-[var(--border)] transition flex-shrink-0"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5 text-[var(--muted)]" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={prompt}
                onChange={(e) => onPromptChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onGenerate();
                  }
                }}
                placeholder="Describe what you want to create..."
                rows={1}
                className="w-full px-5 py-3.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] resize-none focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition text-sm placeholder:text-[var(--muted)]"
                style={{ minHeight: '52px', maxHeight: '120px' }}
              />
            </div>

            <button
              onClick={onGenerate}
              disabled={!prompt.trim() || isGenerating}
              className={cn(
                "px-6 py-3.5 rounded-xl flex items-center gap-2.5 font-semibold transition-all flex-shrink-0",
                prompt.trim() && !isGenerating
                  ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:opacity-90 shadow-lg shadow-purple-500/30"
                  : "bg-[var(--surface3)] text-[var(--muted)] cursor-not-allowed"
              )}
            >
              <Send className="w-5 h-5" />
              <span>Generate</span>
            </button>
          </div>

          <p className="text-xs text-[var(--muted)] text-center mt-3">
            <kbd className="px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)] font-mono text-[10px]">Enter</kbd> generate • <kbd className="px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)] font-mono text-[10px]">Shift+Enter</kbd> new line
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple={maxFiles > 1}
        onChange={onFileSelect}
        style={{ display: 'none' }}
        accept={acceptedFileTypes}
      />
    </main>
  );
}
