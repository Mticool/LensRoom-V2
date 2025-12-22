/**
 * Analytics Component
 * Подключение Google Analytics и Яндекс.Метрики
 */

'use client';

import { useEffect } from 'react';
import Script from 'next/script';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    ym?: (id: number, action: string, ...args: any[]) => void;
    dataLayer?: any[];
  }
}

interface AnalyticsProps {
  gaId?: string;
  ymId?: string;
}

export function Analytics({ gaId, ymId }: AnalyticsProps) {
  // Google Analytics 4
  useEffect(() => {
    if (!gaId || typeof window === 'undefined') return;

    // Initialize dataLayer
    window.dataLayer = window.dataLayer || [];
    function gtag(...args: any[]) {
      window.dataLayer?.push(args);
    }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', gaId, {
      page_path: window.location.pathname,
    });
  }, [gaId]);

  // Яндекс.Метрика
  useEffect(() => {
    if (!ymId || typeof window === 'undefined') return;

    // Initialize ym function
    (function (m: any, e: any, t: string, r: string, i: string, k: any, a: any) {
      m[i] =
        m[i] ||
        function () {
          (m[i].a = m[i].a || []).push(arguments);
        };
      m[i].l = Date.now();
      (k = e.createElement(t)),
        (a = e.getElementsByTagName(t)[0]),
        (k.async = 1),
        (k.src = r),
        a.parentNode.insertBefore(k, a);
    })(
      window,
      document,
      'script',
      'https://mc.yandex.ru/metrika/tag.js',
      'ym',
      '',
      ''
    );

    if (window.ym) {
      window.ym(Number(ymId), 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: true,
      });
    }
  }, [ymId]);

  // Track page views
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleRouteChange = () => {
      if (gaId && window.gtag) {
        window.gtag('config', gaId, {
          page_path: window.location.pathname,
        });
      }
      if (ymId && window.ym) {
        window.ym(Number(ymId), 'hit', window.location.href);
      }
    };

    // Track initial page
    handleRouteChange();

    // Track on popstate (back/forward navigation)
    window.addEventListener('popstate', handleRouteChange);

    return () => {
      window.removeEventListener('popstate', handleRouteChange);
    };
  }, [gaId, ymId]);

  return (
    <>
      {/* Google Analytics */}
      {gaId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', {
                  page_path: window.location.pathname,
                });
              `,
            }}
          />
        </>
      )}

      {/* Яндекс.Метрика */}
      {ymId && (
        <>
          <Script
            id="yandex-metrika"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
                m[i].l=Date.now();
                for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
                k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
                (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
                ym(${ymId}, "init", {
                  clickmap:true,
                  trackLinks:true,
                  accurateTrackBounce:true,
                  webvisor:true
                });
              `,
            }}
          />
          <noscript>
            <div>
              <img
                src={`https://mc.yandex.ru/watch/${ymId}`}
                style={{ position: 'absolute', left: '-9999px' }}
                alt=""
              />
            </div>
          </noscript>
        </>
      )}
    </>
  );
}

/**
 * Helper functions for tracking events
 */

// Track custom event in Google Analytics
export function trackGAEvent(
  action: string,
  category: string,
  label?: string,
  value?: number
) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
}

// Track custom event in Яндекс.Метрика
export function trackYMEvent(
  target: string,
  params?: Record<string, any>
) {
  if (typeof window !== 'undefined' && window.ym) {
    const ymId = process.env.NEXT_PUBLIC_YM_ID;
    if (ymId) {
      window.ym(Number(ymId), 'reachGoal', target, params);
    }
  }
}

// Track page view
export function trackPageView(url: string) {
  if (typeof window !== 'undefined') {
    const gaId = process.env.NEXT_PUBLIC_GA_ID;
    const ymId = process.env.NEXT_PUBLIC_YM_ID;

    if (gaId && window.gtag) {
      window.gtag('config', gaId, {
        page_path: url,
      });
    }

    if (ymId && window.ym) {
      window.ym(Number(ymId), 'hit', url);
    }
  }
}

// Track generation event
export function trackGeneration(model: string, type: 'photo' | 'video', credits: number) {
  trackGAEvent('generate', type, model, credits);
  trackYMEvent('generation', { model, type, credits });
}

// Track purchase event
export function trackPurchase(itemId: string, price: number, currency: string = 'RUB') {
  trackGAEvent('purchase', 'ecommerce', itemId, price);
  trackYMEvent('purchase', { itemId, price, currency });
}

// Track subscription event
export function trackSubscription(tier: string, price: number) {
  trackGAEvent('subscribe', 'subscription', tier, price);
  trackYMEvent('subscription', { tier, price });
}

