"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Sparkles, Download, Star, Crown, Check } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useGeneratorStore } from "@/stores/generator-store";
import type { Prompt } from "@/data/prompts";
import { useState } from "react";

interface PromptModalProps {
  prompt: Prompt | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PromptModal({ prompt, open, onOpenChange }: PromptModalProps) {
  const router = useRouter();
  const { setPrompt } = useGeneratorStore();
  const [copied, setCopied] = useState(false);

  if (!prompt) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.prompt);
    setCopied(true);
    toast.success("Промпт скопирован!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUseInGenerator = () => {
    setPrompt(prompt.prompt);
    router.push("/create");
    toast.success("Промпт загружен в генератор!");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-3 pr-8">
            {prompt.title}
            {prompt.isPremium && (
              <Badge className="bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] text-[#0a0a0f] font-bold">
                <Crown className="w-3 h-3 mr-1" />
                Premium
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Preview Image */}
          <div className="aspect-square rounded-xl overflow-hidden bg-[rgba(255,255,255,0.04)]">
            <img
              src={prompt.preview}
              alt={prompt.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Details */}
          <div className="space-y-6">
            {/* Description */}
            <div>
              <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.55)] uppercase tracking-wide mb-2">
                Описание
              </h3>
              <p className="text-[rgba(255,255,255,0.85)] leading-relaxed">
                {prompt.description}
              </p>
            </div>

            {/* Prompt */}
            <div>
              <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.55)] uppercase tracking-wide mb-2">
                Промпт
              </h3>
              <div className="bg-[rgba(255,255,255,0.04)] rounded-lg p-4 border border-[rgba(255,255,255,0.10)]">
                <code className="text-sm text-[rgba(255,255,255,0.85)] leading-relaxed break-words block">
                  {prompt.prompt}
                </code>
              </div>
            </div>

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2 text-[rgba(255,255,255,0.55)]">
                <Download className="w-4 h-4" />
                <span>{prompt.downloads.toLocaleString()} загрузок</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-[var(--color-gold)] text-[var(--color-gold)]" />
                <span className="text-white font-medium">{prompt.rating}</span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <h3 className="text-xs font-semibold text-[rgba(255,255,255,0.55)] uppercase tracking-wide mb-2">
                Теги
              </h3>
              <div className="flex flex-wrap gap-2">
                {prompt.tags.map((tag) => (
                  <Badge key={tag} variant="default" className="text-xs">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Price */}
            <div className="flex items-center justify-between py-4 border-t border-[rgba(255,255,255,0.08)]">
              <span className="text-[rgba(255,255,255,0.55)]">Стоимость</span>
              <span className="text-2xl font-bold">
                {prompt.isPremium ? (
                  <span className="text-[var(--color-gold)]">{prompt.price} ⭐</span>
                ) : (
                  <span className="text-[var(--color-success)]">FREE</span>
                )}
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleCopy}
                variant="secondary"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-2 text-[var(--color-success)]" />
                    Скопировано!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Копировать
                  </>
                )}
              </Button>
              <Button
                onClick={handleUseInGenerator}
                variant="luxury"
                className="flex-1"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Использовать
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

