import * as React from "react";

type IconProps = {
  className?: string;
  title?: string;
};

function baseProps({ title }: { title?: string }) {
  return title ? { role: "img", "aria-label": title } : { "aria-hidden": true };
}

/**
 * Lightweight, rounded icons for “tile” UI (Higgsfield-like).
 * - Rounded caps/joins
 * - Thin strokes
 * - Uses `currentColor`
 */
export function IconCheck({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...baseProps({ title })}
    >
      <path
        d="M6.5 12.5l3.2 3.2L17.8 7.8"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconPlus({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...baseProps({ title })}
    >
      <path
        d="M12 5v14M5 12h14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconClose({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...baseProps({ title })}
    >
      <path
        d="M7 7l10 10M17 7L7 17"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconVideoCam({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...baseProps({ title })}
    >
      <path
        d="M14.5 8.5H6.8c-1.1 0-2 .9-2 2v3c0 1.1.9 2 2 2h7.7c1.1 0 2-.9 2-2v-3c0-1.1-.9-2-2-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M16.5 10.2l3.2-1.8v7.2l-3.2-1.8V10.2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconImageAdd({ className, title }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      {...baseProps({ title })}
    >
      <path
        d="M7.5 7.5h7c1.1 0 2 .9 2 2v7c0 1.1-.9 2-2 2h-7c-1.1 0-2-.9-2-2v-7c0-1.1.9-2 2-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 16.2l2.6-2.7 2.2 2.1 1.4-1.4 1.9 2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.6 6.2v3.2M14 7.8h3.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

