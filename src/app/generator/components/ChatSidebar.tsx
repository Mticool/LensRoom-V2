'use client';

import { motion } from 'framer-motion';
import { Plus, MessageSquare, Trash2, Image as ImageIcon, Video, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChatSession, SectionType, MODELS_CONFIG } from '../config';

interface ChatSidebarProps {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  onNewChat: () => void;
  onSelectChat: (chatId: string) => void;
  onDeleteChat: (chatId: string) => void;
}

export function ChatSidebar({
  chatSessions,
  activeChatId,
  onNewChat,
  onSelectChat,
  onDeleteChat,
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

  return (
    <motion.div
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 280, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-r border-white/5 bg-[var(--bg)] flex flex-col overflow-hidden"
    >
      {/* New Chat Button */}
      <div className="p-3 border-b border-white/5">
        <button
          onClick={onNewChat}
          className="w-full btn-smooth flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/30 text-sm text-[var(--text)] hover:from-purple-500/30 hover:to-cyan-500/30"
        >
          <Plus className="w-4 h-4" />
          Новый чат
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {chatSessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquare className="w-10 h-10 text-gray-600 mb-3" />
            <p className="text-sm text-gray-500">Нет чатов</p>
            <p className="text-xs text-gray-600 mt-1">Начните генерацию</p>
          </div>
        ) : (
          chatSessions.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group relative flex items-start gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all",
                activeChatId === chat.id
                  ? "bg-white/10 border border-white/10"
                  : "hover:bg-white/5"
              )}
              onClick={() => onSelectChat(chat.id)}
            >
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                getSectionColors(chat.section)
              )}>
                {getSectionIcon(chat.section)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text)] truncate">{chat.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {MODELS_CONFIG[chat.section]?.models.find(m => m.id === chat.model)?.name}
                </p>
              </div>
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

