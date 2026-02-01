'use client';

import { Plus, MessageSquare, Loader2, X, Pencil, Check } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export type StudioThread = {
  id: string;
  model_id: string;
  title: string;
  created_at: string;
};

export function ThreadSidebar({
  open,
  onOpenChange,
  threads,
  activeThreadId,
  isLoading,
  onSelectThread,
  onCreateThread,
  onRenameThread,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
      {/* Toggle button - removed */}

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
                  <div className="text-xs text-[#71717A]">Мои проекты</div>
                  <div className="text-sm font-semibold text-white truncate">
                    {threads.length ? `${threads.length} проектов` : "Проекты"}
                  </div>
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
                <button
                  onClick={onCreateThread}
                  className="inline-flex items-center gap-2 h-10 px-3 rounded-lg bg-[#f59e0b] text-black font-semibold text-sm hover:bg-[#fbbf24] transition-colors relative z-10 w-full justify-center"
                  title="Новый проект"
                  type="button"
                >
                  <Plus className="w-4 h-4" />
                  Новый проект
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
                        <MessageSquare className={cn("w-4 h-4", active ? "text-[#f59e0b]" : "text-[#71717A]")} />
                        {isEditing ? (
                          <div className="flex-1 min-w-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              value={draftTitle}
                              onChange={(e) => setDraftTitle(e.target.value)}
                              className="flex-1 min-w-0 bg-[#0F0F10] border border-[#3A3A3C] rounded-md px-2 py-1 text-sm text-white outline-none focus:border-[#f59e0b]"
                              maxLength={80}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md bg-[#f59e0b] text-black hover:bg-[#fbbf24] transition-colors disabled:opacity-60"
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

