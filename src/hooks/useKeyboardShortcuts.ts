'use client';

import { useEffect, useCallback } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

interface ShortcutConfig {
  key: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  alt?: boolean;
  handler: KeyHandler;
  preventDefault?: boolean;
}

export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    const isInput = target.tagName === 'INPUT' || 
                   target.tagName === 'TEXTAREA' || 
                   target.isContentEditable;

    for (const shortcut of shortcuts) {
      const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = shortcut.ctrl ? (e.ctrlKey || e.metaKey) : true;
      const metaMatch = shortcut.meta ? e.metaKey : true;
      const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
      const altMatch = shortcut.alt ? e.altKey : !e.altKey;

      // For Escape, always trigger even in inputs
      const isEscape = shortcut.key.toLowerCase() === 'escape';
      
      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        if (!isInput || isEscape || shortcut.ctrl || shortcut.meta) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault();
          }
          shortcut.handler(e);
          return;
        }
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Preset hook for generator
export function useGeneratorShortcuts({
  onGenerate,
  onClose,
  onToggleSettings,
  onToggleHistory,
  onCopy,
  onDownload,
}: {
  onGenerate?: () => void;
  onClose?: () => void;
  onToggleSettings?: () => void;
  onToggleHistory?: () => void;
  onCopy?: () => void;
  onDownload?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (onGenerate) {
    shortcuts.push({
      key: 'Enter',
      ctrl: true,
      handler: () => onGenerate(),
    });
  }

  if (onClose) {
    shortcuts.push({
      key: 'Escape',
      handler: () => onClose(),
    });
  }

  if (onToggleSettings) {
    shortcuts.push({
      key: 's',
      ctrl: true,
      handler: () => onToggleSettings(),
    });
  }

  if (onToggleHistory) {
    shortcuts.push({
      key: 'h',
      ctrl: true,
      handler: () => onToggleHistory(),
    });
  }

  if (onCopy) {
    shortcuts.push({
      key: 'c',
      ctrl: true,
      shift: true,
      handler: () => onCopy(),
    });
  }

  if (onDownload) {
    shortcuts.push({
      key: 's',
      ctrl: true,
      shift: true,
      handler: () => onDownload(),
    });
  }

  useKeyboardShortcuts(shortcuts);
}

// Preset hook for lightbox/modal
export function useLightboxShortcuts({
  onClose,
  onNext,
  onPrev,
  onZoomIn,
  onZoomOut,
  onDownload,
}: {
  onClose?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onDownload?: () => void;
}) {
  const shortcuts: ShortcutConfig[] = [];

  if (onClose) {
    shortcuts.push({ key: 'Escape', handler: () => onClose() });
  }

  if (onNext) {
    shortcuts.push({ key: 'ArrowRight', handler: () => onNext() });
  }

  if (onPrev) {
    shortcuts.push({ key: 'ArrowLeft', handler: () => onPrev() });
  }

  if (onZoomIn) {
    shortcuts.push({ key: '+', handler: () => onZoomIn() });
    shortcuts.push({ key: '=', handler: () => onZoomIn() });
  }

  if (onZoomOut) {
    shortcuts.push({ key: '-', handler: () => onZoomOut() });
  }

  if (onDownload) {
    shortcuts.push({ key: 's', ctrl: true, handler: () => onDownload() });
  }

  useKeyboardShortcuts(shortcuts);
}



