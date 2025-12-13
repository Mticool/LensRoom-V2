"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Zap, Clock, Star, Camera, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui";
import type { AIModel } from "@/types/generator";
import { getModelsByCategory, getModelById } from "@/lib/models";
import { useGeneratorStore } from "@/stores";

interface ModelSelectorProps {
  models?: AIModel[];
  selected?: AIModel;
  onChange?: (model: AIModel) => void;
}

const speedConfig = {
  fast: { icon: Zap, label: "Быстро", color: "text-green-500" },
  medium: { icon: Clock, label: "Средне", color: "text-yellow-500" },
  slow: { icon: Clock, label: "Долго", color: "text-orange-500" },
};

const qualityConfig = {
  standard: { label: "STD", color: "bg-muted text-muted-foreground" },
  high: { label: "HIGH", color: "bg-yellow-500/20 text-yellow-500" },
  ultra: { label: "ULTRA", color: "bg-purple-500/20 text-purple-400" },
};

const categoryIcons = {
  photo: Camera,
  video: Video,
  product: Camera,
};

export function ModelSelector({ models, selected, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const storeContentType = useGeneratorStore((s) => s.contentType);
  const storeSelectedModel = useGeneratorStore((s) => s.selectedModel);
  const storeSetModel = useGeneratorStore((s) => s.setSelectedModel);

  const availableModels = models || getModelsByCategory(storeContentType);
  const selectedModel = selected || getModelById(storeSelectedModel) || availableModels[0];
  const handleChange = onChange || ((model: AIModel) => storeSetModel(model.id));

  const SpeedIcon = speedConfig[selectedModel.speed].icon;
  const CategoryIcon = categoryIcons[selectedModel.category];

  return (
    <DropdownMenu.Root open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "w-full flex items-center justify-between gap-3 p-3 rounded-xl border transition-all",
            "bg-card border-border",
            "hover:border-primary/30",
            "focus:outline-none focus:ring-2 focus:ring-primary/20",
            isOpen && "border-primary ring-2 ring-primary/20"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-5 h-5 text-primary" />
            </div>
            
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">
                  {selectedModel.name}
                </span>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", qualityConfig[selectedModel.quality].color)}>
                  {qualityConfig[selectedModel.quality].label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">
                  {selectedModel.provider}
                </span>
                <span className="text-muted-foreground/50">•</span>
                <span className={cn("text-xs flex items-center gap-1", speedConfig[selectedModel.speed].color)}>
                  <SpeedIcon className="w-3 h-3" />
                  {speedConfig[selectedModel.speed].label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="warning" className="gap-1 px-2 py-1 text-xs">
              <Star className="w-3 h-3 fill-current" />
              {selectedModel.creditCost}
            </Badge>
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
          </div>
        </button>
      </DropdownMenu.Trigger>

      <AnimatePresence>
        {isOpen && (
          <DropdownMenu.Portal forceMount>
            <DropdownMenu.Content
              asChild
              side="bottom"
              align="start"
              sideOffset={8}
            >
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "w-[var(--radix-dropdown-menu-trigger-width)] max-h-[360px] overflow-y-auto",
                  "p-2 rounded-xl",
                  "bg-card border border-border",
                  "shadow-xl",
                  "z-[100]"
                )}
                style={{ zIndex: 100 }}
              >
                {availableModels.map((model) => {
                  const isSelected = model.id === selectedModel.id;
                  const ModelSpeedIcon = speedConfig[model.speed].icon;
                  const ModelCategoryIcon = categoryIcons[model.category];

                  return (
                    <DropdownMenu.Item
                      key={model.id}
                      onSelect={() => handleChange(model)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer outline-none",
                        "transition-all",
                        isSelected
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-primary/20" : "bg-muted"
                      )}>
                        <ModelCategoryIcon className={cn("w-5 h-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-semibold", isSelected ? "text-primary" : "text-foreground")}>
                            {model.name}
                          </span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", qualityConfig[model.quality].color)}>
                            {qualityConfig[model.quality].label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{model.provider}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className={cn("text-xs flex items-center gap-1", speedConfig[model.speed].color)}>
                            <ModelSpeedIcon className="w-3 h-3" />
                            {speedConfig[model.speed].label}
                          </span>
                        </div>

                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {model.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="warning" className="gap-1 px-2 py-1 text-xs">
                          <Star className="w-3 h-3 fill-current" />
                          {model.creditCost}
                        </Badge>
                        {isSelected && <Check className="w-4 h-4 text-primary" />}
                      </div>
                    </DropdownMenu.Item>
                  );
                })}
              </motion.div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </AnimatePresence>
    </DropdownMenu.Root>
  );
}
