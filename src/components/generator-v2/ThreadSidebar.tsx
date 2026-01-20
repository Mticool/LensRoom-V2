'use client';

import { Plus, MessageSquare, Loader2, X, Pencil, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ModelSelector } from "@/components/generator-v2/ModelSelector";

export type StudioThread = {
  id: string;
  model_id: string;
  title: string;
  created_at: string;
};

export function ThreadSidebar({
  open,
  onOpenChange,
  selectedModelId,
  onModelChange,
  modelName,
  threads,
  activeThreadId,
  isLoading,
  onSelectThread,
  onCreateThread,
  onRenameThread,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedModelId: string;
  onModelChange: (modelId: string) => void;
  modelName: string;
  threads: StudioThread[];
  activeThreadId: string | null;
  isLoading: boolean;
  onSelectThread: (threadId: string) => void;
  onCreateThread: () => void;
  onRenameThread?: (threadId: string, title: string) => Promise<void> | void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const editingThread = useMemo(
    () => threads.find((t) => t.id === editingId) || null,
    [threads, editingId]
  );

  const startEdit = (t: StudioThread) => {
    setEditingId(t.id);
    setDraftTitle(t.title || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftTitle("");
    setSavingId(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const next = String(draftTitle || "").trim();
    if (!next) return;
    if (next.length > 80) return;
    if (!onRenameThread) return;
    try {
      setSavingId(editingId);
      await onRenameThread(editingId, next);
      cancelEdit();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <>
      {/* Toggle button (always visible) */}
      <button
        onClick={() => onOpenChange(true)}
        className="fixed left-3 z-40 inline-flex items-center gap-2 h-10 px-3 rounded-xl bg-[#18181B]/95 backdrop-blur border border-[#27272A] text-white hover:bg-[#1F1F22] transition-colors
                   bottom-[calc(env(safe-area-inset-bottom)+6.25rem)] md:bottom-auto md:top-20 md:left-4"
        title="Открыть чаты"
        type="button"
      >
        <MessageSquare className="w-4 h-4 text-[#CDFF00]" />
        <span className="text-sm font-medium">Чаты</span>
      </button>

      {/* Drawer */}
      {open && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            aria-label="Закрыть"
            className="absolute inset-0 bg-black/50"
            onClick={() => onOpenChange(false)}
          />

          <aside className="absolute left-0 top-0 bottom-0 w-[320px] max-w-[85vw] border-r border-[#27272A] bg-[#0F0F10] flex flex-col">
            <div className="p-4 border-b border-[#27272A]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-[#71717A]">Рабочие пространства</div>
                  <div className="text-sm font-semibold text-white truncate">{modelName}</div>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  title="Закрыть"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <div className="flex-1 min-w-0 relative z-0">
                  <ModelSelector value={selectedModelId} onChange={onModelChange} direction="down" />
                </div>
                <button
                  onClick={onCreateThread}
                  className="inline-flex items-center gap-2 h-10 px-3 rounded-lg bg-[#CDFF00] text-black font-semibold text-sm hover:bg-[#B8E600] transition-colors relative z-10"
                  title="Новый чат"
                  type="button"
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
                <div className="p-4 text-[#A1A1AA] text-sm">Нет чатов. Нажмите «Новый».</div>
              ) : (
                <div className="space-y-1">
                  {threads.map((t) => {
                    const active = t.id === activeThreadId;
                    const isEditing = t.id === editingId;
                    return (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (!isEditing) {
                            onSelectThread(t.id);
                            onOpenChange(false);
                          }
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors",
                          active ? "bg-[#27272A] text-white" : "text-[#E4E4E7] hover:bg-[#18181B]"
                        )}
                      >
                        <MessageSquare className={cn("w-4 h-4", active ? "text-[#CDFF00]" : "text-[#71717A]")} />
                        {isEditing ? (
                          <div className="flex-1 min-w-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              className="flex-1 min-w-0 bg-[#0F0F10] border border-[#3A3A3C] rounded-md px-2 py-1 text-sm text-white outline-none focus:border-[#CDFF00]"
                              maxLength={80}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[#CDFF00] text-black hover:bg-[#B8E600] transition-colors disabled:opacity-60"
                              onClick={saveEdit}
                              disabled={savingId === t.id || draftTitle.trim().length === 0}
                              title="Сохранить"
                            >
                              {savingId === t.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                              onClick={cancelEdit}
                              title="Отмена"
                            >
                              <X className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <span className="text-sm truncate flex-1 min-w-0">{t.title}</span>
                            {onRenameThread && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(t);
                                }}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-white/5 hover:bg-white/10 transition-colors"
                                title="Переименовать"
                              >
                                <Pencil className="w-4 h-4 text-[#A1A1AA]" />
                              </button>
                            )}
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

