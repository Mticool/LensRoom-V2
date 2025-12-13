'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Star, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Prompt } from '@/data/prompts';
import Link from 'next/link';

interface PromptModalProps {
  prompt: Prompt | null;
  isOpen?: boolean;
  onClose?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function PromptModal({ prompt, isOpen, onClose, open, onOpenChange }: PromptModalProps) {
  if (!prompt) return null;
  
  const isModalOpen = open ?? isOpen ?? false;
  const handleClose = () => {
    if (onOpenChange) onOpenChange(false);
    if (onClose) onClose();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt.prompt);
    toast.success('Промпт скопирован!');
  };

  return (
    <Dialog open={isModalOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{prompt.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Preview Image */}
          <div className="aspect-video rounded-lg overflow-hidden bg-muted">
            <img
              src={prompt.imageUrl}
              alt={prompt.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Description */}
          <p className="text-muted-foreground">{prompt.description}</p>

          {/* Tags */}
          <div className="flex flex-wrap gap-2">
            {prompt.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>

          {/* Prompt Text */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-sm font-mono">{prompt.prompt}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Download className="w-4 h-4" />
              <span>{prompt.downloads}</span>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500" />
              <span>{prompt.rating}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleCopy} variant="outline" className="flex-1">
              <Copy className="w-4 h-4 mr-2" />
              Копировать
            </Button>
            <Button asChild className="flex-1">
              <Link href={`/create?prompt=${encodeURIComponent(prompt.prompt)}`}>
                <Wand2 className="w-4 h-4 mr-2" />
                Использовать
              </Link>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

