'use client';

import { Hero } from './Hero';
import { Row } from './Row';
import { Grid } from './Grid';
import {
  featuredItem,
  heroSideItems,
  trendingItems,
  photoItems,
  videoItems,
  toolItems,
} from './data';

export function HomeV2() {
  return (
    <main className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      {/* Hero Section */}
      <Hero featured={featuredItem} sideItems={heroSideItems} />

      {/* New & Trending - Horizontal Scroll */}
      <Row title="New & Trending" items={trendingItems} />

      {/* Photo Grid - Masonry */}
      <Grid title="Photo Generation" items={photoItems} type="masonry" />

      {/* Video Grid - Uniform 16:9 */}
      <Grid title="Video Generation" items={videoItems} type="uniform" />

      {/* Tools Grid - Small cards */}
      <Grid title="Tools & Editors" items={toolItems} type="uniform" />

      {/* Footer CTA */}
      <section className="py-20 border-t border-[var(--border)]">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text)] mb-4">
            Ready to create?
          </h2>
          <p className="text-[var(--muted)] mb-8 max-w-xl mx-auto">
            Join thousands of creators using LensRoom to bring their ideas to life
          </p>
          <a
            href="/create"
            className="inline-block px-8 py-4 rounded-xl bg-[var(--gold)] text-black font-semibold hover:bg-[var(--gold-hover)] transition-colors"
          >
            Get Started Free
          </a>
        </div>
      </section>
    </main>
  );
}
