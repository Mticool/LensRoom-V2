'use client';

import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

// === VEO ICON - Google gradient (blue → green → yellow) ===
export function VeoIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="veo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#34A853" />
          <stop offset="100%" stopColor="#FBBC05" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" stroke="url(#veo-gradient)" strokeWidth="2" fill="none" />
      <path
        d="M8 12L11 15L16 9"
        stroke="url(#veo-gradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="url(#veo-gradient)" opacity="0.3" />
    </svg>
  );
}

// === KLING ICON - K-logo with motion blur, cyan gradient ===
export function KlingIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="kling-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06B6D4" />
          <stop offset="100%" stopColor="#3B82F6" />
        </linearGradient>
        <filter id="kling-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
        </filter>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="url(#kling-gradient)" opacity="0.15" />
      <path
        d="M8 6V18M8 12L14 6M8 12L14 18"
        stroke="url(#kling-gradient)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 6V18M10 12L16 6M10 12L16 18"
        stroke="url(#kling-gradient)"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.3"
        filter="url(#kling-blur)"
      />
    </svg>
  );
}

// === KLING MOTION ICON - Figure with motion waves ===
export function KlingMotionIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="motion-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="100%" stopColor="#00D9FF" />
        </linearGradient>
      </defs>
      {/* Human figure silhouette */}
      <circle cx="9" cy="5" r="2.5" fill="url(#motion-gradient)" />
      <path
        d="M9 8C6.5 8 5 10 5 12V16H7V12C7 11 7.5 10 9 10C10.5 10 11 11 11 12V16H13V12C13 10 11.5 8 9 8Z"
        fill="url(#motion-gradient)"
      />
      <path d="M6 16V20H8V16H6Z" fill="url(#motion-gradient)" />
      <path d="M10 16V20H12V16H10Z" fill="url(#motion-gradient)" />
      {/* Motion waves */}
      <path
        d="M15 8C16.5 9 17.5 10.5 17.5 12C17.5 13.5 16.5 15 15 16"
        stroke="url(#motion-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M17 6C19.5 8 21 10 21 12C21 14 19.5 16 17 18"
        stroke="url(#motion-gradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.5"
      />
    </svg>
  );
}

// === GROK ICON - X-style minimalistic ===
export function GrokIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#000" />
      <path
        d="M6 6L18 18M18 6L6 18"
        stroke="#FFF"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

// === SORA ICON - OpenAI rainbow circle ===
export function SoraIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="sora-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF6B6B" />
          <stop offset="25%" stopColor="#FFE66D" />
          <stop offset="50%" stopColor="#4ECDC4" />
          <stop offset="75%" stopColor="#45B7D1" />
          <stop offset="100%" stopColor="#A855F7" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" stroke="url(#sora-gradient)" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="6" stroke="url(#sora-gradient)" strokeWidth="1.5" fill="none" opacity="0.6" />
      <circle cx="12" cy="12" r="2.5" fill="url(#sora-gradient)" />
    </svg>
  );
}

// === WAN ICON - Cinematic camera lens ===
export function WanIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="wan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E1E1E" />
          <stop offset="100%" stopColor="#3D3D3D" />
        </linearGradient>
        <linearGradient id="wan-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#D97706" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#wan-gradient)" />
      <circle cx="12" cy="12" r="7" stroke="url(#wan-gold)" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="4" stroke="url(#wan-gold)" strokeWidth="1" fill="none" opacity="0.7" />
      <circle cx="12" cy="12" r="1.5" fill="url(#wan-gold)" />
      {/* Aperture blades hint */}
      <path d="M12 5L13 8H11L12 5Z" fill="url(#wan-gold)" opacity="0.5" />
      <path d="M12 19L11 16H13L12 19Z" fill="url(#wan-gold)" opacity="0.5" />
      <path d="M5 12L8 11V13L5 12Z" fill="url(#wan-gold)" opacity="0.5" />
      <path d="M19 12L16 13V11L19 12Z" fill="url(#wan-gold)" opacity="0.5" />
    </svg>
  );
}

// === BYTEDANCE ICON - TikTok style ===
export function BytedanceIcon({ className = '', size = 24 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="bytedance-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#25F4EE" />
          <stop offset="50%" stopColor="#FE2C55" />
          <stop offset="100%" stopColor="#FE2C55" />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="18" height="18" rx="5" fill="#000" />
      <path
        d="M15.5 7C15.5 7 16.5 8.5 18 9V11.5C16.5 11 15.5 10 15.5 10V15.5C15.5 18 13.5 19.5 11 19.5C8.5 19.5 6.5 17.5 6.5 15C6.5 12.5 8.5 10.5 11 10.5V13C9.5 13 8.5 14 8.5 15C8.5 16 9.5 17 11 17C12.5 17 13.5 16 13.5 14.5V4.5H15.5V7Z"
        fill="url(#bytedance-gradient)"
      />
    </svg>
  );
}

// === MODE ICONS ===

export function TextToVideoIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 8H9M5 12H9M5 16H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M14 12L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 9L22 12L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ImageToVideoIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="4" width="10" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
      <circle cx="5.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="M2 14L5 11L8 14L12 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 12L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M19 9L22 12L19 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function StartEndIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="6" width="7" height="12" rx="1" stroke="currentColor" strokeWidth="2" />
      <rect x="15" y="6" width="7" height="12" rx="1" stroke="currentColor" strokeWidth="2" />
      <path d="M11 12L13 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 2" />
      <path d="M5 9V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <path d="M18.5 9V15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function VideoToVideoIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="5" width="8" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M5 10L8 12L5 14V10Z" fill="currentColor" opacity="0.5" />
      <path d="M12 12L16 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M14 10L16 12L14 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="18" y="5" width="4" height="14" rx="1" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function MotionIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="2" />
      <path d="M8 9V15M5 15L8 20L11 15M5 15H11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 8C15.5 9 16.5 10.5 16.5 12C16.5 13.5 15.5 15 14 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M17 6C19.5 8 21 10 21 12C21 14 19.5 16 17 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function StyleTransferIcon({ className = '', size = 20 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="12" cy="6" r="3" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="14" r="3" stroke="currentColor" strokeWidth="2" />
      <path d="M9 7L15 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8 15L11 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 16L17 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// === MODEL BADGE COMPONENT ===
export type ModelTag = 'NEW' | 'PRO' | 'ULTRA' | 'FAST' | 'TOP' | 'CORE';

interface ModelBadgeProps {
  tag: ModelTag;
  className?: string;
}

export function ModelBadge({ tag, className = '' }: ModelBadgeProps) {
  const styles: Record<ModelTag, string> = {
    NEW: 'bg-green-500/20 text-green-400 border-green-500/30',
    PRO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    ULTRA: 'bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-purple-300 border-purple-500/30',
    FAST: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    TOP: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    CORE: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded border ${styles[tag]} ${className}`}
    >
      {tag}
    </span>
  );
}

// === MODEL ICON MAPPER ===
export function getModelIcon(modelId: string): React.FC<IconProps> {
  const icons: Record<string, React.FC<IconProps>> = {
    'veo-3.1': VeoIcon,
    'kling': KlingIcon,
    'kling-motion-control': KlingMotionIcon,
    'grok-video': GrokIcon,
    'sora-2': SoraIcon,
    'sora-2-pro': SoraIcon,
    'sora-storyboard': SoraIcon,
    'wan': WanIcon,
    'bytedance-pro': BytedanceIcon,
    'kling-ai-avatar': KlingIcon,
    'kling-ai-avatar-standard': KlingIcon,
    'kling-ai-avatar-pro': KlingIcon,
    'kling-o1': KlingIcon,
    'kling-o3-standard': KlingIcon,
    'kling-o1-edit': KlingIcon,
    'wan-2.6': WanIcon,
  };

  return icons[modelId] || KlingIcon;
}

// === MODE ICON MAPPER ===
export function getModeIcon(mode: string): React.FC<IconProps> {
  const icons: Record<string, React.FC<IconProps>> = {
    't2v': TextToVideoIcon,
    'text-to-video': TextToVideoIcon,
    'i2v': ImageToVideoIcon,
    'image-to-video': ImageToVideoIcon,
    'start_end': StartEndIcon,
    'first-last-frame': StartEndIcon,
    'v2v': VideoToVideoIcon,
    'video-to-video': VideoToVideoIcon,
    'motion': MotionIcon,
    'motion_control': MotionIcon,
    'style_transfer': StyleTransferIcon,
    'style-transfer': StyleTransferIcon,
  };

  return icons[mode] || TextToVideoIcon;
}
