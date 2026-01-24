'use client';

import { useEffect, useRef } from 'react';
import { X, Star, Minus, Plus } from 'lucide-react';

interface HiggsSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  aspectRatio: string;
  onAspectRatioChange: (value: string) => void;
  quality: string;
  onQualityChange: (value: string) => void;
  quantity: number;
  onQuantityChange: (value: number) => void;
  outputFormat: 'png' | 'jpg';
  onOutputFormatChange: (value: 'png' | 'jpg') => void;
  negativePrompt: string;
  onNegativePromptChange: (value: string) => void;
  seed: number | null;
  onSeedChange: (value: number | null) => void;
  aspectRatioOptions: string[];
  qualityOptions: string[];
  estimatedCost: number;
}

// Quality descriptions
const QUALITY_INFO: Record<string, { description: string; badge?: string }> = {
  '1K': { description: 'Быстро • Хорошее качество' },
  '2K': { description: 'Баланс • Рекомендуется' },
  '4K': { description: 'Максимум деталей', badge: 'Premium' },
};

export function HiggsSettingsModal({
  isOpen,
  onClose,
  aspectRatio,
  onAspectRatioChange,
  quality,
  onQualityChange,
  quantity,
  onQuantityChange,
  outputFormat,
  onOutputFormatChange,
  negativePrompt,
  onNegativePromptChange,
  seed,
  onSeedChange,
  aspectRatioOptions,
  qualityOptions,
  estimatedCost,
}: HiggsSettingsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="higgs-modal-backdrop" onClick={handleBackdropClick}>
      <div className="higgs-modal" ref={modalRef}>
        {/* Header */}
        <div className="higgs-modal-header">
          <h2>Настройки генерации</h2>
          <button onClick={onClose} className="higgs-modal-close">
            <X />
          </button>
        </div>

        {/* Content */}
        <div className="higgs-modal-content">
          {/* Aspect Ratio */}
          <div className="higgs-modal-section">
            <label className="higgs-modal-label">Пропорции</label>
            <div className="higgs-modal-chips">
              {aspectRatioOptions.map((ar) => (
                <button
                  key={ar}
                  onClick={() => onAspectRatioChange(ar)}
                  className={`higgs-modal-chip ${aspectRatio === ar ? 'active' : ''}`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Quality */}
          <div className="higgs-modal-section">
            <label className="higgs-modal-label">Качество</label>
            <div className="higgs-modal-quality-list">
              {qualityOptions.map((q) => {
                const info = QUALITY_INFO[q] || { description: '' };
                return (
                  <button
                    key={q}
                    onClick={() => onQualityChange(q)}
                    className={`higgs-modal-quality-item ${quality === q ? 'active' : ''}`}
                  >
                    <div className="higgs-modal-quality-header">
                      <span className="higgs-modal-quality-name">{q}</span>
                      {info.badge && (
                        <span className="higgs-modal-quality-badge">{info.badge}</span>
                      )}
                    </div>
                    <span className="higgs-modal-quality-desc">{info.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quantity */}
          <div className="higgs-modal-section">
            <label className="higgs-modal-label">Количество</label>
            <div className="higgs-modal-quantity">
              <button
                onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="higgs-modal-quantity-btn"
              >
                <Minus />
              </button>
              <span className="higgs-modal-quantity-value">{quantity}</span>
              <button
                onClick={() => onQuantityChange(Math.min(4, quantity + 1))}
                disabled={quantity >= 4}
                className="higgs-modal-quantity-btn"
              >
                <Plus />
              </button>
            </div>
          </div>

          {/* Output Format */}
          <div className="higgs-modal-section">
            <label className="higgs-modal-label">Формат</label>
            <div className="higgs-modal-chips">
              <button
                onClick={() => onOutputFormatChange('png')}
                className={`higgs-modal-chip ${outputFormat === 'png' ? 'active' : ''}`}
              >
                PNG
              </button>
              <button
                onClick={() => onOutputFormatChange('jpg')}
                className={`higgs-modal-chip ${outputFormat === 'jpg' ? 'active' : ''}`}
              >
                JPG
              </button>
            </div>
          </div>

          {/* Advanced: Negative Prompt */}
          <div className="higgs-modal-section">
            <label className="higgs-modal-label">Негативный промпт</label>
            <textarea
              value={negativePrompt}
              onChange={(e) => onNegativePromptChange(e.target.value)}
              placeholder="Что исключить из изображения..."
              className="higgs-modal-textarea"
              rows={2}
            />
          </div>

          {/* Advanced: Seed */}
          <div className="higgs-modal-section">
            <label className="higgs-modal-label">Seed (опционально)</label>
            <input
              type="number"
              value={seed ?? ''}
              onChange={(e) => onSeedChange(e.target.value ? Number(e.target.value) : null)}
              placeholder="Случайный"
              className="higgs-modal-input"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="higgs-modal-footer">
          <div className="higgs-modal-cost">
            <Star className="higgs-modal-cost-icon" />
            <span>{estimatedCost} за генерацию</span>
          </div>
          <button onClick={onClose} className="higgs-modal-done-btn">
            Готово
          </button>
        </div>
      </div>
    </div>
  );
}
