import React from 'react';
import homeRu from './home.ru.json';

export type HomeCopy = typeof homeRu;

export function getHomeCopy(): HomeCopy {
  return homeRu;
}

// Helper to render text with line breaks
export function renderWithBreaks(text: string): React.ReactNode[] {
  return text.split('\n').map((line, i, arr) => (
    i < arr.length - 1 ? (
      <span key={i}>{line}<br /></span>
    ) : (
      <span key={i}>{line}</span>
    )
  ));
}
