// Client-side navigation helper for Next.js App Router.
// In very slow/dev environments router navigation can stall; this adds a safe hard-navigation fallback.

export type RouterLike = {
  push: (href: string, options?: any) => void;
  replace?: (href: string, options?: any) => void;
};

function toAbsoluteUrl(href: string): URL | null {
  if (typeof window === "undefined") return null;
  try {
    return new URL(href, window.location.origin);
  } catch {
    return null;
  }
}

export function navigateWithFallback(
  router: RouterLike,
  href: string,
  opts?: { replace?: boolean; scroll?: boolean; fallbackMs?: number }
) {
  const fallbackMs = typeof opts?.fallbackMs === "number" ? opts.fallbackMs : 5000;
  try {
    if (opts?.replace && router.replace) router.replace(href, { scroll: opts?.scroll });
    else router.push(href, { scroll: opts?.scroll });
  } catch {
    // ignore and rely on hard navigation below
  }

  const target = toAbsoluteUrl(href);
  if (!target) return;

  // If the URL doesn't change soon (router stall), force a hard navigation.
  window.setTimeout(() => {
    const current = window.location.pathname + window.location.search;
    const desired = target.pathname + target.search;
    if (current !== desired) {
      window.location.assign(desired);
    }
  }, fallbackMs);
}

