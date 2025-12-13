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
  fast: { icon: Zap, label: "Быстро", color: "text-[var(--color-success)]" },
  medium: { icon: Clock, label: "Средне", color: "text-[var(--color-warning)]" },
  slow: { icon: Clock, label: "Долго", color: "text-orange-400" },
};

const qualityConfig = {
  standard: { label: "STD", color: "bg-[rgba(148,163,184,0.15)] text-[#94A3B8] border border-[rgba(148,163,184,0.25)]" },
  high: { label: "HIGH", color: "bg-[rgba(96,165,250,0.15)] text-[#60A5FA] border border-[rgba(96,165,250,0.25)]" },
  ultra: { label: "ULTRA", color: "bg-[rgba(168,85,247,0.15)] text-[#A855F7] border border-[rgba(168,85,247,0.25)]" },
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
            "w-full flex items-center justify-between gap-3 p-3.5 rounded-xl border transition-all",
            "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.10)]",
            "hover:border-[rgba(255,255,255,0.22)]",
            "focus:outline-none",
            isOpen && "border-[var(--color-gold)] shadow-[0_0_0_3px_rgba(245,200,66,0.15)]"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[rgba(245,200,66,0.20)] to-[rgba(168,85,247,0.20)] flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-5 h-5 text-[var(--color-gold)]" />
            </div>
            
            <div className="text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {selectedModel.name}
                </span>
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", qualityConfig[selectedModel.quality].color)}>
                  {qualityConfig[selectedModel.quality].label}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-[rgba(255,255,255,0.55)]">
                  {selectedModel.provider}
                </span>
                <span className="text-[rgba(255,255,255,0.25)]">•</span>
                <span className={cn("text-xs flex items-center gap-1", speedConfig[selectedModel.speed].color)}>
                  <SpeedIcon className="w-3 h-3" />
                  {speedConfig[selectedModel.speed].label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge variant="gold" className="gap-1 px-2 py-1 text-xs">
              <Star className="w-3 h-3 fill-current" />
              {selectedModel.creditCost}
            </Badge>
            <ChevronDown className={cn("w-4 h-4 text-[rgba(255,255,255,0.55)] transition-transform", isOpen && "rotate-180")} />
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
              className="z-50"
            >
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
                className={cn(
                  "w-[var(--radix-dropdown-menu-trigger-width)] max-h-[360px] overflow-y-auto",
                  "p-2 rounded-xl",
                  "bg-[rgba(15,15,20,0.98)] border border-[rgba(255,255,255,0.12)]",
                  "shadow-2xl backdrop-blur-xl"
                )}
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
                          ? "bg-[rgba(245,200,66,0.12)] border border-[rgba(245,200,66,0.25)]"
                          : "hover:bg-[rgba(255,255,255,0.06)] border border-transparent"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-[rgba(245,200,66,0.20)]" : "bg-[rgba(255,255,255,0.06)]"
                      )}>
                        <ModelCategoryIcon className={cn("w-5 h-5", isSelected ? "text-[var(--color-gold)]" : "text-[rgba(255,255,255,0.55)]")} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn("font-semibold", isSelected ? "text-[var(--color-gold)]" : "text-white")}>
                            {model.name}
                          </span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", qualityConfig[model.quality].color)}>
                            {qualityConfig[model.quality].label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-[rgba(255,255,255,0.55)]">{model.provider}</span>
                          <span className="text-[rgba(255,255,255,0.25)]">•</span>
                          <span className={cn("text-xs flex items-center gap-1", speedConfig[model.speed].color)}>
                            <ModelSpeedIcon className="w-3 h-3" />
                            {speedConfig[model.speed].label}
                          </span>
                        </div>

                        <p className="text-xs text-[rgba(255,255,255,0.55)] mt-1 line-clamp-1">
                          {model.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge variant="gold" className="gap-1 px-2 py-1 text-xs">
                          <Star className="w-3 h-3 fill-current" />
                          {model.creditCost}
                        </Badge>
                        {isSelected && <Check className="w-4 h-4 text-[var(--color-gold)]" />}
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
