"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { 
  ImageIcon, 
  Video, 
  Clock, 
  Download,
  Share2,
  Heart,
  Layers,
  History,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGeneratorBuilderStore } from "@/stores/generator-builder-store";
import { getModelById, getModeById } from "@/config/model-registry";

type TabId = "result" | "references" | "history";

const TABS: { id: TabId; label: string; icon: typeof ImageIcon }[] = [
  { id: "result", label: "Результат", icon: ImageIcon },
  { id: "references", label: "Референсы", icon: Layers },
  { id: "history", label: "История", icon: History },
];

export function PreviewPanel() {
  const [activeTab, setActiveTab] = useState<TabId>("result");
  
  const {
    contentType,
    modelId,
    modeId,
    refA,
    refB,
    isGenerating,
    progress,
    results,
    selectedResultIndex,
    setSelectedResultIndex,
  } = useGeneratorBuilderStore();
  
  const currentModel = getModelById(modelId);
  const currentMode = currentModel ? getModeById(currentModel, modeId) : null;
  const selectedResult = results[selectedResultIndex];
  
  const refAPreview = refA instanceof File ? URL.createObjectURL(refA) : refA;
  const refBPreview = refB instanceof File ? URL.createObjectURL(refB) : refB;
  
  return (
    <div className="sticky top-24 space-y-4">
      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--color-bg-secondary)] rounded-xl">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]"
                : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
      
      {/* Tab Content */}
      <Card variant="hover" padding="none" className="overflow-hidden">
        {activeTab === "result" && (
          <ResultTab
            contentType={contentType}
            isGenerating={isGenerating}
            progress={progress}
            selectedResult={selectedResult}
            results={results}
            selectedResultIndex={selectedResultIndex}
            onSelectResult={setSelectedResultIndex}
          />
        )}
        
        {activeTab === "references" && (
          <ReferencesTab
            refA={refAPreview}
            refB={refBPreview}
            labelA={currentMode?.refLabels.a}
            labelB={currentMode?.refLabels.b}
          />
        )}
        
        {activeTab === "history" && (
          <HistoryTab />
        )}
      </Card>
    </div>
  );
}

// ===== RESULT TAB =====

interface ResultTabProps {
  contentType: string;
  isGenerating: boolean;
  progress: number;
  selectedResult: { id: string; url: string; type: "image" | "video" } | undefined;
  results: { id: string; url: string; type: "image" | "video" }[];
  selectedResultIndex: number;
  onSelectResult: (index: number) => void;
}

function ResultTab({
  contentType,
  isGenerating,
  progress,
  selectedResult,
  results,
  selectedResultIndex,
  onSelectResult,
}: ResultTabProps) {
  return (
    <div>
      {/* Main Preview */}
      <div className="aspect-square lg:aspect-[4/3] flex items-center justify-center bg-[var(--color-bg-tertiary)]">
        {isGenerating ? (
          <div className="text-center p-8">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="var(--color-border)"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  stroke="var(--color-purple-500)"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * progress) / 100}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold text-[var(--color-text-primary)]">
                  {progress}%
                </span>
              </div>
            </div>
            <p className="text-[var(--color-text-primary)] font-medium">
              Генерация...
            </p>
            <p className="text-sm text-[var(--color-text-tertiary)] mt-1">
              Это займёт несколько секунд
            </p>
          </div>
        ) : selectedResult ? (
          <div className="relative w-full h-full group">
            {selectedResult.type === "video" ? (
              <video
                src={selectedResult.url}
                controls
                className="w-full h-full object-contain"
              />
            ) : (
              <img
                src={selectedResult.url}
                alt="Generated"
                className="w-full h-full object-contain"
              />
            )}
            
            {/* Actions overlay */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button size="icon" variant="secondary" className="bg-black/50 hover:bg-black/70 border-0">
                <Download className="w-4 h-4 text-white" />
              </Button>
              <Button size="icon" variant="secondary" className="bg-black/50 hover:bg-black/70 border-0">
                <Share2 className="w-4 h-4 text-white" />
              </Button>
              <Button size="icon" variant="secondary" className="bg-black/50 hover:bg-black/70 border-0">
                <Heart className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center p-8">
            <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-[var(--color-border)] 
                            flex items-center justify-center mx-auto mb-4">
              {contentType === "video" ? (
                <Video className="w-10 h-10 text-[var(--color-text-tertiary)]" />
              ) : (
                <ImageIcon className="w-10 h-10 text-[var(--color-text-tertiary)]" />
              )}
            </div>
            <h3 className="text-xl font-semibold text-[var(--color-text-primary)] mb-2">
              {contentType === "video" ? "Ваше видео" : "Ваше изображение"} появится здесь
            </h3>
            <p className="text-[var(--color-text-secondary)] text-sm">
              Настройте параметры слева и нажмите «Создать»
            </p>
          </div>
        )}
      </div>
      
      {/* Results grid */}
      {results.length > 1 && (
        <div className="p-3 border-t border-[var(--color-border)]">
          <div className="grid grid-cols-4 gap-2">
            {results.map((result, i) => (
              <button
                key={result.id}
                onClick={() => onSelectResult(i)}
                className={cn(
                  "aspect-square rounded-lg overflow-hidden border-2 transition-all",
                  selectedResultIndex === i
                    ? "border-[var(--color-purple-500)]"
                    : "border-transparent hover:border-[var(--color-border-strong)]"
                )}
              >
                {result.type === "video" ? (
                  <video src={result.url} className="w-full h-full object-cover" />
                ) : (
                  <img src={result.url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ===== REFERENCES TAB =====

interface ReferencesTabProps {
  refA: string | null;
  refB: string | null;
  labelA?: string;
  labelB?: string;
}

function ReferencesTab({ refA, refB, labelA, labelB }: ReferencesTabProps) {
  const hasRefs = refA || refB;
  
  if (!hasRefs) {
    return (
      <div className="aspect-square lg:aspect-[4/3] flex items-center justify-center">
        <div className="text-center p-8">
          <Layers className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            Нет референсов
          </h3>
          <p className="text-[var(--color-text-secondary)] text-sm">
            Загрузите изображения в блоке «Референсы» слева
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-4 space-y-4">
      {refA && (
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">{labelA || "Референс A"}</p>
          <div className="aspect-video rounded-xl overflow-hidden border border-[var(--color-border)]">
            <img src={refA} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
      
      {refB && (
        <div>
          <p className="text-xs text-[var(--color-text-secondary)] mb-2">{labelB || "Референс B"}</p>
          <div className="aspect-video rounded-xl overflow-hidden border border-[var(--color-border)]">
            <img src={refB} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      )}
    </div>
  );
}

// ===== HISTORY TAB =====

function HistoryTab() {
  // TODO: Connect to history store/API
  const mockHistory = [
    { id: "1", url: "https://images.unsplash.com/photo-1618556450994-a6a128ef0d9d?w=200", date: "Сегодня" },
    { id: "2", url: "https://images.unsplash.com/photo-1682687220742-aba19b6e5df1?w=200", date: "Вчера" },
  ];
  
  return (
    <div className="p-4">
      <div className="space-y-3">
        {mockHistory.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-[var(--color-bg-tertiary)] transition-colors cursor-pointer"
          >
            <div className="w-16 h-16 rounded-lg overflow-hidden border border-[var(--color-border)]">
              <img src={item.url} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--color-text-primary)]">
                Генерация #{item.id}
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)]">
                {item.date}
              </p>
            </div>
          </div>
        ))}
        
        {mockHistory.length === 0 && (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-[var(--color-text-tertiary)] mx-auto mb-4" />
            <p className="text-[var(--color-text-secondary)]">
              История пуста
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

