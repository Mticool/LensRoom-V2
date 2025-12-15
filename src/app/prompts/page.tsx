"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/loading";
import { Search, Crown, Download, Star } from "lucide-react";
import { MOCK_PROMPTS, PROMPT_CATEGORIES, type Prompt } from "@/data/prompts";
import { PromptModal } from "@/components/library/prompt-modal";

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function PromptsPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Simulate initial data loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const filteredPrompts = MOCK_PROMPTS.filter((p) => {
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      selectedCategory === "Все" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setModalOpen(true);
  };

  return (
    <div className="min-h-screen pt-24 pb-20 bg-[var(--bg)]">
      <motion.div
        className="container mx-auto px-4 lg:px-8 py-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <motion.div
          className="mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-[var(--text)]">
            Библиотека <span className="text-[var(--gold)]">промптов</span>
          </h1>
          <p className="text-xl text-[var(--text2)]">
            {MOCK_PROMPTS.length}+ готовых промптов для всех задач
          </p>
        </motion.div>

        {/* Search */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <div className="relative max-w-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
            <Input
              placeholder="Поиск промптов..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-12 h-12"
            />
          </div>
        </motion.div>

        {/* Categories */}
        <motion.div
          className="flex gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          {PROMPT_CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "secondary"}
              onClick={() => setSelectedCategory(cat)}
              className="whitespace-nowrap"
              size="sm"
            >
              {cat}
            </Button>
          ))}
        </motion.div>

        {/* Results count */}
        <div className="mb-6 text-sm text-[var(--muted)]">
          {isLoading ? "Загрузка..." : `Найдено: ${filteredPrompts.length} промптов`}
        </div>

        {/* Loading Skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          /* Prompts Grid */
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredPrompts.map((prompt) => (
            <motion.div
              key={prompt.id}
              variants={item}
              onClick={() => handleOpenPrompt(prompt)}
            >
              <Card
                variant="hover"
                className="group overflow-hidden cursor-pointer hover:shadow-[0_0_30px_var(--gold-glow)] transition-all duration-300 p-0 h-full"
              >
                {/* Preview Image */}
                <div className="relative aspect-square overflow-hidden bg-[var(--surface2)]">
                  <img
                    src={prompt.imageUrl}
                    alt={prompt.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {prompt.isPremium && (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-[var(--gold)] text-[#0a0a0f] font-bold px-3 py-1">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                    <span className="text-white font-semibold bg-black/60 px-4 py-2 rounded-lg">
                      Открыть
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 bg-[var(--surface)]">
                  <h3 className="text-base font-bold text-[var(--text)] mb-2 line-clamp-1 group-hover:text-[var(--gold)] transition-colors">
                    {prompt.title}
                  </h3>
                  <p className="text-sm text-[var(--text2)] mb-4 line-clamp-2 leading-relaxed">
                    {prompt.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {prompt.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-[var(--surface2)] text-xs text-[var(--muted)] border border-[var(--border)]"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <div className="flex items-center gap-3 text-sm text-[var(--muted)]">
                      <div className="flex items-center gap-1">
                        <Download className="w-3.5 h-3.5" />
                        <span>{prompt.downloads.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-[var(--gold)] text-[var(--gold)]" />
                        <span className="text-[var(--text)] font-medium">
                          {prompt.rating}
                        </span>
                      </div>
                    </div>
                    <div className="font-bold">
                      {prompt.isPremium ? (
                        <span className="text-[var(--gold)]">
                          {prompt.price} ⭐
                        </span>
                      ) : (
                        <span className="text-green-400">FREE</span>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
            ))}
          </motion.div>
        )}

        {/* Empty state */}
        {!isLoading && filteredPrompts.length === 0 && (
          <div className="text-center py-20">
            <p className="text-[var(--text2)] text-lg">
              Промпты не найдены
            </p>
            <p className="text-[var(--muted)] mt-2">
              Попробуйте изменить параметры поиска
            </p>
          </div>
        )}
      </motion.div>

      {/* Prompt Modal */}
      <PromptModal
        prompt={selectedPrompt}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
