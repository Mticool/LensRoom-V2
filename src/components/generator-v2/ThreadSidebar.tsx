'use client';

import { Plus, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type StudioThread = {
  id: string;
  model_id: string;
  title: string;
  created_at: string;
};

export function ThreadSidebar({
  modelName,
  threads,
  activeThreadId,
  isLoading,
  onSelectThread,
  onCreateThread,
}: {
  modelName: string;
  threads: StudioThread[];
  activeThreadId: string | null;
  isLoading: boolean;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
}) {
  return (
    <aside className="hidden lg:flex lg:flex-col w-[280px] shrink-0 border-r border-[#27272A] bg-[#0F0F10]">
      <div className="p-4 border-b border-[#27272A]">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-[#71717A]">Рабочие пространства</div>
            <div className="text-sm font-semibold text-white truncate">{modelName}</div>
          </div>
          <button
            onClick={onCreateThread}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-[#CDFF00] text-black font-semibold text-sm hover:bg-[#B8E600] transition-colors"
            title="Новый чат"
          >
            <Plus className="w-4 h-4" />
            Новый
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="p-4 text-[#A1A1AA] text-sm flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Загрузка чатов...
          </div>
        ) : threads.length === 0 ? (
          <div className="p-4 text-[#A1A1AA] text-sm">
            Нет чатов. Нажмите «Новый».
          </div>
        ) : (
          <div className="space-y-1">
            {threads.map((t) => {
              const active = t.id === activeThreadId;
              return (
                <button
                  key={t.id}
                  onClick={() => onSelectThread(t.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                    active ? "bg-[#27272A] text-white" : "text-[#E4E4E7] hover:bg-[#18181B]"
                  )}
                >
                  <MessageSquare className={cn("w-4 h-4", active ? "text-[#CDFF00]" : "text-[#71717A]")} />
                  <span className="text-sm truncate">{t.title}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}

