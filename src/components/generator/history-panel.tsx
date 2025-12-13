"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Trash2,
  Star,
  ChevronDown,
  Image as ImageIcon,
  Video,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface HistoryItem {
  id: string;
  type: "image" | "video";
  thumbnail: string;
  prompt: string;
  model: string;
  createdAt: Date;
  isFavorite?: boolean;
}

interface HistoryPanelProps {
  items: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onClear: () => void;
}

export function HistoryPanel({
  items,
  onSelect,
  onDelete,
  onToggleFavorite,
  onClear,
}: HistoryPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const filteredItems =
    filter === "all" ? items : items.filter((item) => item.isFavorite);

  return (
    <Card  className="overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[rgba(255,255,255,0.10)]">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-lg font-semibold text-white hover:text-[var(--color-gold)] transition-colors"
          >
            <Clock className="w-5 h-5" />
            История генераций
            <ChevronDown
              className={cn(
                "w-4 h-4 transition-transform",
                isExpanded && "rotate-180"
              )}
            />
          </button>

          {items.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClear}>
              <Trash2 className="w-4 h-4 mr-1" />
              Очистить
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        {isExpanded && (
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === "all"
                  ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)]"
                  : "text-[rgba(255,255,255,0.55)] hover:text-white"
              )}
            >
              Все ({items.length})
            </button>
            <button
              onClick={() => setFilter("favorites")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === "favorites"
                  ? "bg-[var(--color-gold)]/20 text-[var(--color-gold)]"
                  : "text-[rgba(255,255,255,0.55)] hover:text-white"
              )}
            >
              <Star className="w-4 h-4 inline mr-1" />
              Избранное ({items.filter((i) => i.isFavorite).length})
            </button>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: "auto" }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[rgba(255,255,255,0.04)] flex items-center justify-center mx-auto mb-3">
                  {filter === "favorites" ? (
                    <Star className="w-8 h-8 text-[rgba(255,255,255,0.30)]" />
                  ) : (
                    <Clock className="w-8 h-8 text-[rgba(255,255,255,0.30)]" />
                  )}
                </div>
                <p className="text-[rgba(255,255,255,0.55)]">
                  {filter === "favorites"
                    ? "Нет избранных генераций"
                    : "История пуста"}
                </p>
              </div>
            ) : (
              <div className="p-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      className="group relative"
                    >
                      {/* Thumbnail */}
                      <button
                        onClick={() => onSelect(item)}
                        className="w-full aspect-square rounded-lg overflow-hidden bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.10)] hover:border-[var(--color-gold)] transition-all relative"
                      >
                        <img
                          src={item.thumbnail}
                          alt={item.prompt}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />

                        {/* Type badge */}
                        <Badge className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] px-1.5 py-0.5">
                          {item.type === "video" ? (
                            <Video className="w-3 h-3 mr-1" />
                          ) : (
                            <ImageIcon className="w-3 h-3 mr-1" />
                          )}
                          {item.type === "video" ? "видео" : "фото"}
                        </Badge>

                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                          <div className="text-white text-xs font-medium text-center line-clamp-3">
                            {item.prompt}
                          </div>
                        </div>
                      </button>

                      {/* Actions */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(item.id);
                          }}
                          className={cn(
                            "w-7 h-7 rounded-lg backdrop-blur-sm flex items-center justify-center transition-colors",
                            item.isFavorite
                              ? "bg-[var(--color-gold)] text-black"
                              : "bg-black/70 text-[rgba(255,255,255,0.70)] hover:text-[var(--color-gold)]"
                          )}
                        >
                          <Star
                            className={cn(
                              "w-4 h-4",
                              item.isFavorite && "fill-current"
                            )}
                          />
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(item.id);
                          }}
                          className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur-sm flex items-center justify-center text-[rgba(255,255,255,0.70)] hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Model & Date */}
                      <div className="mt-2 space-y-0.5">
                        <div className="text-xs text-[rgba(255,255,255,0.55)] truncate">
                          {item.model}
                        </div>
                        <div className="text-xs text-[rgba(255,255,255,0.40)]">
                          {new Date(item.createdAt).toLocaleDateString("ru-RU", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

export type { HistoryItem };

