"use client";

import * as React from "react";
import { Sparkles, BookOpen, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { useGeneratorStore } from "@/stores";

interface PromptEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  onGenerate?: () => void;
  maxLength?: number;
  placeholder?: string;
  onOpenLibrary?: () => void;
}

const MAX_CHARS = 2000;

export function PromptEditor({
  value,
  onChange,
  onGenerate,
  maxLength = MAX_CHARS,
  placeholder = "Опишите, что хотите создать...",
  onOpenLibrary,
}: PromptEditorProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const [isFocused, setIsFocused] = React.useState(false);
  const [isEnhancing, setIsEnhancing] = React.useState(false);

  const storePrompt = useGeneratorStore((s) => s.prompt);
  const storeSetPrompt = useGeneratorStore((s) => s.setPrompt);
  const storeIsGenerating = useGeneratorStore((s) => s.isGenerating);
  const storeStartGeneration = useGeneratorStore((s) => s.startGeneration);

  const prompt = value ?? storePrompt;
  const setPrompt = onChange ?? storeSetPrompt;
  const handleGenerate = onGenerate ?? storeStartGeneration;

  const charCount = prompt.length;
  const isNearLimit = charCount > maxLength * 0.9;

  const adjustHeight = React.useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.max(120, Math.min(textarea.scrollHeight, 280));
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  React.useEffect(() => {
    adjustHeight();
  }, [prompt, adjustHeight]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    if (newValue.length <= maxLength) {
      setPrompt(newValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      if (prompt.trim() && !storeIsGenerating) {
        handleGenerate();
      }
    }
  };

  const handleEnhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;
    
    setIsEnhancing(true);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    const enhancements = ["высокое качество", "детализированный", "профессиональное освещение"];
    const randomEnhancements = enhancements.sort(() => Math.random() - 0.5).slice(0, 2).join(", ");
    
    setPrompt(`${prompt}, ${randomEnhancements}`.slice(0, maxLength));
    setIsEnhancing(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[rgba(255,255,255,0.55)]">
          ⌘ + Enter для генерации
        </span>
      </div>

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          rows={4}
          className={cn(
            "w-full p-4 pb-10 rounded-xl resize-none",
            "bg-[rgba(255,255,255,0.04)] border",
            isFocused 
              ? "border-[var(--color-gold)] shadow-[0_0_0_3px_rgba(245,200,66,0.15)]" 
              : "border-[rgba(255,255,255,0.16)] hover:border-[rgba(255,255,255,0.22)]",
            "text-white placeholder:text-[rgba(255,255,255,0.40)]",
            "focus:outline-none",
            "transition-all",
            "text-[15px] leading-relaxed"
          )}
          style={{ minHeight: "120px" }}
        />

        <div className={cn(
          "absolute bottom-3 right-3 text-xs font-medium",
          isNearLimit ? "text-[var(--color-warning)]" : "text-[rgba(255,255,255,0.40)]"
        )}>
          {charCount.toLocaleString()} / {maxLength.toLocaleString()}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={handleEnhancePrompt}
          disabled={!prompt.trim() || isEnhancing}
        >
          {isEnhancing ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              Улучшаем...
            </>
          ) : (
            <>
              <Wand2 className="w-4 h-4" />
              Улучшить AI
            </>
          )}
        </Button>

        <Button variant="ghost" size="sm" onClick={onOpenLibrary}>
          <BookOpen className="w-4 h-4" />
          Библиотека
        </Button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {["высокое качество", "4K", "детализированный", "реалистичный"].map((tag) => (
          <button
            key={tag}
            onClick={() => {
              const newPrompt = prompt ? `${prompt}, ${tag}` : tag;
              if (newPrompt.length <= maxLength) setPrompt(newPrompt);
            }}
            className="px-2.5 py-1 rounded-full text-xs font-medium bg-[rgba(255,255,255,0.06)] text-[rgba(255,255,255,0.70)] border border-[rgba(255,255,255,0.10)] hover:border-[rgba(255,255,255,0.22)] hover:text-white transition-all"
          >
            + {tag}
          </button>
        ))}
      </div>
    </div>
  );
}
