'use client';

import { useRef, KeyboardEvent } from 'react';
import { cn } from '@/lib/utils';
import { Paperclip, Send, X } from 'lucide-react';

interface PromptBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isGenerating: boolean;
  costStars: number;
  
  // File upload
  uploadedFiles?: File[];
  onFileSelect?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveFile?: (index: number) => void;
  maxFiles?: number;
  acceptedFileTypes?: string;
  
  // Optional customization
  placeholder?: string;
  showFileCount?: boolean;
  disabled?: boolean;
}

export function PromptBar({
  value,
  onChange,
  onSubmit,
  isGenerating,
  costStars,
  uploadedFiles = [],
  onFileSelect,
  onRemoveFile,
  maxFiles = 4,
  acceptedFileTypes = '',
  placeholder = 'Describe what you want to create...',
  showFileCount = true,
  disabled = false,
}: PromptBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isGenerating && !disabled) {
        onSubmit();
      }
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const canSubmit = value.trim() && !isGenerating && !disabled;

  return (
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
                {onRemoveFile && (
                  <button
                    onClick={() => onRemoveFile(i)}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-lg"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div className="flex gap-3 items-end">
          {/* Attach Button */}
          {onFileSelect && (
            <button
              onClick={handleAttachClick}
              disabled={disabled || uploadedFiles.length >= maxFiles}
              className={cn(
                "p-3.5 rounded-xl border border-[var(--border)] transition flex-shrink-0 relative",
                disabled || uploadedFiles.length >= maxFiles
                  ? "bg-[var(--surface2)] opacity-50 cursor-not-allowed"
                  : "bg-[var(--surface2)] hover:bg-[var(--surface3)] hover:border-[var(--accent-primary)]"
              )}
              title={uploadedFiles.length >= maxFiles ? `Maximum ${maxFiles} files` : 'Attach file'}
            >
              <Paperclip className="w-5 h-5 text-[var(--muted)]" />
              
              {/* File Counter Badge */}
              {showFileCount && uploadedFiles.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[var(--accent-primary)] text-white text-[10px] font-bold flex items-center justify-center">
                  {uploadedFiles.length}
                </span>
              )}
            </button>
          )}
          
          {/* Textarea */}
          <div className="flex-1 relative">
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              disabled={disabled}
              className={cn(
                "w-full px-5 py-3.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] resize-none focus:outline-none focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 transition text-sm placeholder:text-[var(--muted)]",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              style={{ minHeight: '52px', maxHeight: '120px' }}
            />
          </div>

          {/* Cost Display */}
          <div className="flex-shrink-0 px-4 py-3.5 rounded-xl bg-[var(--surface2)] border border-[var(--border)] flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--accent-primary)]">{costStars}</span>
            <span className="text-sm text-[var(--muted)]">⭐</span>
          </div>

          {/* Submit Button */}
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className={cn(
              "px-6 py-3.5 rounded-xl flex items-center gap-2.5 font-semibold transition-all flex-shrink-0",
              canSubmit
                ? "bg-gradient-to-r from-[var(--accent-primary)] to-[var(--accent-secondary)] text-white hover:opacity-90 shadow-lg shadow-purple-500/30"
                : "bg-[var(--surface3)] text-[var(--muted)] cursor-not-allowed"
            )}
          >
            <Send className="w-5 h-5" />
            <span>Send</span>
          </button>
        </div>

        {/* File Counter Text (optional, shows below input) */}
        {showFileCount && onFileSelect && uploadedFiles.length > 0 && (
          <div className="mt-2 text-xs text-[var(--muted)] text-center">
            {uploadedFiles.length} / {maxFiles} files attached
          </div>
        )}

        {/* Keyboard Shortcuts Hint */}
        <p className="text-xs text-[var(--muted)] text-center mt-3">
          <kbd className="px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)] font-mono text-[10px]">Enter</kbd> send • <kbd className="px-2 py-0.5 rounded bg-[var(--surface2)] border border-[var(--border)] font-mono text-[10px]">Shift+Enter</kbd> new line
        </p>
      </div>

      {/* Hidden file input */}
      {onFileSelect && (
        <input
          ref={fileInputRef}
          type="file"
          multiple={maxFiles > 1}
          onChange={onFileSelect}
          style={{ display: 'none' }}
          accept={acceptedFileTypes}
        />
      )}
    </div>
  );
}