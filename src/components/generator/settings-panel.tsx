"use client";

import * as React from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Settings, Dices, SlidersHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { useGeneratorStore } from "@/stores/generator-store";
import type { AspectRatio } from "@/types/generator";

const aspectRatios: { id: AspectRatio; label: string; icon: string }[] = [
  { id: "1:1", label: "1:1", icon: "□" },
  { id: "16:9", label: "16:9", icon: "▭" },
  { id: "9:16", label: "9:16", icon: "▯" },
  { id: "4:3", label: "4:3", icon: "▭" },
];

export function SettingsPanel() {
  const [isOpen, setIsOpen] = React.useState(false);

  const {
    aspectRatio,
    variants,
    seed,
    cfgScale,
    steps,
    negativePrompt,
    setAspectRatio,
    setVariants,
    setSeed,
    setCfgScale,
    setSteps,
    setNegativePrompt,
  } = useGeneratorStore();

  const generateRandomSeed = () => {
    setSeed(Math.floor(Math.random() * 2147483647));
  };

  return (
    <div className="space-y-5">
      {/* Aspect Ratio */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-white uppercase tracking-wide">
          Соотношение сторон
        </label>
        <div className="grid grid-cols-4 gap-2">
          {aspectRatios.map((ratio) => (
            <button
              key={ratio.id}
              onClick={() => setAspectRatio(ratio.id)}
              className={cn(
                "flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all",
                aspectRatio === ratio.id
                  ? "bg-[rgba(245,200,66,0.15)] border-[var(--color-gold)] text-[var(--color-gold)]"
                  : "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.70)] hover:border-[rgba(255,255,255,0.22)] hover:text-white"
              )}
            >
              <span className="text-lg leading-none">{ratio.icon}</span>
              <span className="text-xs font-semibold">{ratio.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Variants */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-xs font-semibold text-white uppercase tracking-wide">
            Количество вариантов
          </label>
          <span className="text-sm font-bold text-[var(--color-gold)]">{variants}</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((num) => (
            <button
              key={num}
              onClick={() => setVariants(num)}
              className={cn(
                "py-2.5 rounded-lg text-sm font-semibold border transition-all",
                variants === num
                  ? "bg-[rgba(245,200,66,0.15)] border-[var(--color-gold)] text-[var(--color-gold)]"
                  : "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.70)] hover:border-[rgba(255,255,255,0.22)] hover:text-white"
              )}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Settings - Collapsible */}
      <Collapsible.Root open={isOpen} onOpenChange={setIsOpen}>
        <Collapsible.Trigger asChild>
          <button
            className={cn(
              "w-full flex items-center justify-between p-3.5 rounded-xl border transition-all",
              "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.10)]",
              "hover:border-[rgba(255,255,255,0.22)]",
              isOpen && "border-[rgba(245,200,66,0.4)] bg-[rgba(245,200,66,0.08)]"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Settings className={cn("w-4 h-4", isOpen ? "text-[var(--color-gold)]" : "text-[rgba(255,255,255,0.55)]")} />
              <span className={cn("text-sm font-semibold", isOpen ? "text-[var(--color-gold)]" : "text-white")}>
                Расширенные настройки
              </span>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-[rgba(255,255,255,0.55)] transition-transform", isOpen && "rotate-180")} />
          </button>
        </Collapsible.Trigger>

        <AnimatePresence>
          {isOpen && (
            <Collapsible.Content forceMount asChild>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="pt-4 space-y-5">
                  {/* CFG Scale */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-[rgba(255,255,255,0.55)]" />
                        CFG Scale
                      </label>
                      <span className="text-sm font-bold text-[var(--color-gold)]">{cfgScale}</span>
                    </div>
                    <Slider
                      value={[cfgScale]}
                      onValueChange={([value]) => setCfgScale(value)}
                      min={1}
                      max={20}
                      step={0.5}
                    />
                    <div className="flex justify-between text-xs text-[rgba(255,255,255,0.55)]">
                      <span>Креативно</span>
                      <span>Точно</span>
                    </div>
                  </div>

                  {/* Steps */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-[rgba(255,255,255,0.55)]" />
                        Steps
                      </label>
                      <span className="text-sm font-bold text-[var(--color-gold)]">{steps}</span>
                    </div>
                    <Slider
                      value={[steps]}
                      onValueChange={([value]) => setSteps(value)}
                      min={10}
                      max={50}
                      step={1}
                    />
                    <div className="flex justify-between text-xs text-[rgba(255,255,255,0.55)]">
                      <span>Быстро</span>
                      <span>Качественно</span>
                    </div>
                  </div>

                  {/* Seed */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        <Dices className="w-4 h-4 text-[rgba(255,255,255,0.55)]" />
                        Seed
                      </label>
                      <button
                        onClick={generateRandomSeed}
                        className="text-xs font-semibold text-[var(--color-gold)] hover:text-[var(--color-gold-light)] transition-colors"
                      >
                        🎲 Случайный
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={seed ?? ""}
                        onChange={(e) => setSeed(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="Случайный"
                        className="flex-1 px-4 py-2.5 rounded-lg text-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.16)] text-white placeholder:text-[rgba(255,255,255,0.40)] focus:outline-none focus:border-[var(--color-gold)] focus:shadow-[0_0_0_3px_rgba(245,200,66,0.15)] transition-all"
                      />
                      {seed !== undefined && (
                        <button
                          onClick={() => setSeed(undefined)}
                          className="px-3 rounded-lg bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] text-[rgba(255,255,255,0.55)] hover:border-[rgba(255,255,255,0.22)] hover:text-white transition-all"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Negative Prompt */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white">
                      Негативный промпт
                    </label>
                    <textarea
                      value={negativePrompt}
                      onChange={(e) => setNegativePrompt(e.target.value)}
                      placeholder="blurry, low quality, text..."
                      rows={2}
                      className="w-full px-4 py-3 rounded-lg text-sm resize-none bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.16)] text-white placeholder:text-[rgba(255,255,255,0.40)] focus:outline-none focus:border-[var(--color-gold)] focus:shadow-[0_0_0_3px_rgba(245,200,66,0.15)] transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            </Collapsible.Content>
          )}
        </AnimatePresence>
      </Collapsible.Root>
    </div>
  );
}