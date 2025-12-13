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
  standard: { label: "STD", color: "bg-zinc-700 text-zinc-300" },
  high: { label: "HIGH", color: "bg-yellow-600 text-white" },
  ultra: { label: "ULTRA", color: "bg-purple-600 text-white" },
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
            "bg-zinc-900 border-zinc-700",
            "hover:border-zinc-600",
            "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
            isOpen && "border-purple-500 ring-2 ring-purple-500/30"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center flex-shrink-0">
              <CategoryIcon className="w-5 h-5 text-white" />
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
                <span className="text-xs text-zinc-400">
                  {selectedModel.provider}
                </span>
                <span className="text-zinc-600">•</span>
                <span className={cn("text-xs flex items-center gap-1", speedConfig[selectedModel.speed].color)}>
                  <SpeedIcon className="w-3 h-3" />
                  {speedConfig[selectedModel.speed].label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-600 text-white text-xs font-medium">
              <Star className="w-3 h-3 fill-current" />
              {selectedModel.creditCost ?? '—'}
            </span>
            <ChevronDown className={cn("w-4 h-4 text-zinc-400 transition-transform", isOpen && "rotate-180")} />
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
                className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[360px] overflow-y-auto p-2 rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl"
                style={{ zIndex: 9999 }}
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
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer outline-none transition-all",
                        isSelected
                          ? "bg-purple-600"
                          : "hover:bg-zinc-800"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-purple-500" : "bg-zinc-800"
                      )}>
                        <ModelCategoryIcon className="w-5 h-5 text-white" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white">
                            {model.name}
                          </span>
                          <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded", qualityConfig[model.quality].color)}>
                            {qualityConfig[model.quality].label}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-zinc-400">{model.provider}</span>
                          <span className="text-zinc-600">•</span>
                          <span className={cn("text-xs flex items-center gap-1", speedConfig[model.speed].color)}>
                            <ModelSpeedIcon className="w-3 h-3" />
                            {speedConfig[model.speed].label}
                          </span>
                        </div>

                        <p className="text-xs text-zinc-400 mt-1 line-clamp-1">
                          {model.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="flex items-center gap-1 px-2 py-1 rounded bg-yellow-600 text-white text-xs font-medium">
                          <Star className="w-3 h-3 fill-current" />
                          {model.creditCost ?? '—'}
                        </span>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
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
