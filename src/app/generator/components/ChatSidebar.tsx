'use client';

import { motion } from 'framer-motion';
import { Plus, MessageSquare, Trash2, Image as ImageIcon, Video, Mic, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatSession, SectionType, MODELS_CONFIG } from '../config';

interface ChatSidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
  onClose?: () => void; // For mobile close
}

export function ChatSidebar({
  chatSessions,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onClose,
}: ChatSidebarProps) {
  const getSectionIcon = (section: SectionType) => {
    switch (section) {
      case 'image': return <ImageIcon className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'audio': return <Mic className="w-4 h-4" />;
    }
  };

  const getSectionColors = (section: SectionType) => {
    switch (section) {
      case 'image': return 'bg-purple-500/20 text-purple-400';
      case 'video': return 'bg-cyan-500/20 text-cyan-400';
      case 'audio': return 'bg-pink-500/20 text-pink-400';
    }
  };

  const handleSelectChat = (chatId: string) => {
    onSelectChat(chatId);
    // Close on mobile after selection
    if (window.innerWidth < 768 && onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ x: -280, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: -280, opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "border-r border-[var(--border)] bg-[var(--surface)] flex flex-col overflow-hidden z-50",
          // Mobile: full screen overlay
          "fixed inset-y-0 left-0 w-[300px] md:relative md:inset-auto"
        )}
      >
      {/* Header with close button on mobile */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4 md:hidden">
          <h2 className="text-[15px] font-semibold text-[var(--text)] tracking-tight">История</h2>
          <button
            onClick={onClose}
            className="p-2.5 rounded-[12px] hover:bg-[var(--surface2)] text-[var(--muted)] hover:text-[var(--text)] transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => {
            onNewChat();
            if (window.innerWidth < 768 && onClose) onClose();
          }}
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-[14px] bg-gradient-to-r from-[#a78bfa]/15 to-[#22d3ee]/15 border border-[var(--accent-primary)]/20 text-[14px] font-medium text-[var(--text)] hover:from-[#a78bfa]/25 hover:to-[#22d3ee]/25 active:scale-[0.98] touch-manipulation transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          Новый чат
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-premium">
        {chatSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-[16px] bg-[var(--surface2)] flex items-center justify-center mb-4">
              <MessageSquare className="w-6 h-6 text-[var(--muted)]" />
            </div>
            <p className="text-[14px] font-medium text-[var(--muted-light)]">Нет чатов</p>
            <p className="text-[13px] text-[var(--muted)] mt-1">Начните генерацию</p>
          </div>
        ) : (
          chatSessions.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group relative flex items-start gap-3 px-3 py-3 rounded-[14px] cursor-pointer transition-all duration-200 touch-manipulation active:scale-[0.98]",
                activeChatId === chat.id
                  ? "bg-[var(--accent-subtle)] border border-[var(--accent-primary)]/20"
                  : "hover:bg-[var(--surface2)] border border-transparent"
              )}
              onClick={() => handleSelectChat(chat.id)}
            >
              <div className={cn(
                "w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 transition-colors",
                getSectionColors(chat.section)
              )}>
                {getSectionIcon(chat.section)}
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <p className="text-[14px] font-medium text-[var(--text)] truncate leading-tight">{chat.title}</p>
                <p className="text-[12px] text-[var(--muted)] truncate mt-0.5">
                  {MODELS_CONFIG[chat.section]?.models.find(m => m.id === chat.model)?.name}
                </p>
              </div>
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="md:opacity-0 md:group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-[10px] hover:bg-red-500/15 active:bg-red-500/25 text-[var(--muted)] hover:text-red-400 transition-all duration-200 touch-manipulation"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
    </>
  );
}

