'use client';

import { useState, useRef, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2,
      });
    }
  }, [isVisible]);

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="inline-flex items-center cursor-help"
      >
        {children || <HelpCircle className="w-3.5 h-3.5 text-white/40 hover:text-white/60 transition-colors" />}
      </div>

      {isVisible && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="bg-black border border-white/20 rounded-lg px-3 py-2 shadow-xl mb-2 max-w-xs">
            <p className="text-xs text-white leading-relaxed">{content}</p>
          </div>
          {/* Arrow */}
          <div className="w-2 h-2 bg-black border-r border-b border-white/20 transform rotate-45 mx-auto -mt-1" />
        </div>
      )}
    </>
  );
}





