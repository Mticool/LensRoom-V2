'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ImageIcon, ChevronDown, Wand2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CompactSettingsProps {
  modelName: string;
  aspectRatio: string;
  quality: string;
  variantsCount: number;
  hasReferenceImage: boolean;
  onAspectRatioChange: (value: string) => void;
  onQualityChange: (value: string) => void;
  onVariantsChange: (value: number) => void;
  onDrawClick: () => void;
}

const ASPECT_RATIOS = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
];

const QUALITIES = [
  { value: '1K', label: '1K', cost: 30 },
  { value: '2K', label: '2K', cost: 30 },
  { value: '4K', label: '4K', cost: 40 },
];

export function CompactSettings({
  modelName,
  aspectRatio,
  quality,
  variantsCount,
  hasReferenceImage,
  onAspectRatioChange,
  onQualityChange,
  onVariantsChange,
  onDrawClick,
}: CompactSettingsProps) {
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const aspectRef = useRef<HTMLDivElement>(null);
  const qualityRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aspectRef.current && !aspectRef.current.contains(e.target as Node)) {
        setShowAspectMenu(false);
      }
      if (qualityRef.current && !qualityRef.current.contains(e.target as Node)) {
        setShowQualityMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Model Badge */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1a2e] border border-white/10">
        <div className="w-6 h-6 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-black font-bold text-sm">
          G
        </div>
        <span className="text-sm font-medium text-white">{modelName}</span>
      </div>

      {/* Variants Counter */}
      <div className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#1a1a2e] border border-white/10">
        <button
          onClick={() => onVariantsChange(Math.max(1, variantsCount - 1))}
          className="text-gray-400 hover:text-white transition-colors"
          disabled={variantsCount <= 1}
        >
          −
        </button>
        <span className="text-sm font-medium text-white min-w-[40px] text-center">
          {variantsCount}/4
        </span>
        <button
          onClick={() => onVariantsChange(Math.min(4, variantsCount + 1))}
          className="text-gray-400 hover:text-white transition-colors"
          disabled={variantsCount >= 4}
        >
          +
        </button>
      </div>

      {/* Aspect Ratio Dropdown */}
      <div className="relative" ref={aspectRef}>
        <button
          onClick={() => {
            setShowAspectMenu(!showAspectMenu);
            setShowQualityMenu(false);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1a2e] border border-white/10 hover:bg-[#252540] transition-colors"
        >
          <ImageIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-white">{aspectRatio}</span>
          <ChevronDown className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            showAspectMenu && "rotate-180"
          )} />
        </button>

        <AnimatePresence>
          {showAspectMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 z-50 min-w-[120px] bg-[#1a1a2e] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
            >
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.value}
                  onClick={() => {
                    onAspectRatioChange(ratio.value);
                    setShowAspectMenu(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors",
                    aspectRatio === ratio.value
                      ? "bg-cyan-500/20 text-cyan-400 font-medium"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  {ratio.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Quality Dropdown */}
      <div className="relative" ref={qualityRef}>
        <button
          onClick={() => {
            setShowQualityMenu(!showQualityMenu);
            setShowAspectMenu(false);
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1a2e] border border-white/10 hover:bg-[#252540] transition-colors"
        >
          <Wand2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-white">{quality}</span>
          <ChevronDown className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            showQualityMenu && "rotate-180"
          )} />
        </button>

        <AnimatePresence>
          {showQualityMenu && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full left-0 mt-2 z-50 min-w-[140px] bg-[#1a1a2e] border border-white/20 rounded-xl shadow-2xl overflow-hidden"
            >
              {QUALITIES.map((q) => (
                <button
                  key={q.value}
                  onClick={() => {
                    onQualityChange(q.value);
                    setShowQualityMenu(false);
                  }}
                  className={cn(
                    "w-full px-4 py-2.5 text-left text-sm transition-colors flex items-center justify-between",
                    quality === q.value
                      ? "bg-cyan-500/20 text-cyan-400 font-medium"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <span>{q.label}</span>
                  <span className="text-xs text-gray-500">{q.cost}⭐</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Draw Button (Reference Image) */}
      <button
        onClick={onDrawClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl border transition-all",
          hasReferenceImage
            ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-400"
            : "bg-[#1a1a2e] border-white/10 text-gray-400 hover:text-white hover:bg-[#252540]"
        )}
      >
        <Wand2 className="w-4 h-4" />
        <span className="text-sm font-medium">Draw</span>
      </button>
    </div>
  );
}
