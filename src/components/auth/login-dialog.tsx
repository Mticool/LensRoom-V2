'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTelegramAuth } from '@/providers/telegram-auth-provider';
import { TelegramLoginButton } from './telegram-login-button';
import { toast } from 'sonner';

interface LoginDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoginDialog({ isOpen, onClose }: LoginDialogProps) {
  const [showBotPrompt, setShowBotPrompt] = useState(false);
  const { loading } = useTelegramAuth();

  const handleTelegramSuccess = (canNotify: boolean) => {
    if (!canNotify) {
      setShowBotPrompt(true);
    } else {
      onClose();
    }
  };

  const handleConnectBot = () => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'LensRoomBot';
    window.open(`https://t.me/${botUsername}?start=notify`, '_blank');
    toast.info('После запуска бота вернитесь сюда');
  };

  const handleSkipBot = () => {
    setShowBotPrompt(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 z-50"
            onClick={onClose}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50
                       w-full max-w-md p-6 bg-[var(--surface)] rounded-2xl
                       border border-[var(--border)] shadow-2xl"
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--surface2)] transition-colors"
            >
              <X className="w-5 h-5 text-[var(--muted)]" />
            </button>

            {showBotPrompt ? (
              /* Bot Connection Prompt */
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-[#0088cc]/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-[#0088cc]" />
                </div>
                
                <h2 className="text-xl font-bold text-[var(--text)] mb-2">
                  Подключите бота
                </h2>
                <p className="text-[var(--text2)] mb-6">
                  Чтобы получать уведомления о новых функциях и запуске Академии,
                  нажмите Start в нашем Telegram-боте.
                </p>

                <div className="space-y-3">
                  <Button
                    onClick={handleConnectBot}
                    className="w-full bg-[#0088cc] hover:bg-[#0077b5] text-white"
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Подключить бота
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={handleSkipBot}
                    className="w-full"
                  >
                    Пропустить
                  </Button>
                </div>

                <p className="text-xs text-[var(--muted)] mt-4">
                  Вы всегда можете подключить бота позже в настройках
                </p>
              </div>
            ) : (
              /* Main Login View */
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-[var(--text)] mb-2">
                    Вход в LensRoom
                  </h2>
                  <p className="text-[var(--text2)]">
                    Войдите через Telegram для доступа ко всем функциям
                  </p>
                </div>

                {/* Telegram Login */}
                <div className="space-y-4">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-[var(--gold)]" />
                    </div>
                  ) : (
                    <div className="flex justify-center">
                      <TelegramLoginButton
                        buttonSize="large"
                        cornerRadius={12}
                        onSuccess={handleTelegramSuccess}
                      />
                    </div>
                  )}

                  {/* Benefits */}
                  <div className="pt-4 border-t border-[var(--border)]">
                    <p className="text-xs text-[var(--muted)] text-center mb-3">
                      Что вы получите:
                    </p>
                    <ul className="space-y-2 text-sm text-[var(--text2)]">
                      <li className="flex items-center gap-2">
                        <span className="text-[var(--gold)]">✓</span>
                        100 бесплатных кредитов
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[var(--gold)]">✓</span>
                        Сохранение истории генераций
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="text-[var(--gold)]">✓</span>
                        Уведомления о новых функциях
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Footer */}
                <p className="text-[10px] text-[var(--muted)] text-center mt-6">
                  Нажимая «Войти», вы соглашаетесь с условиями использования
                </p>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
