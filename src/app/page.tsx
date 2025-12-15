'use client';

import Link from 'next/link';
import { 
  ArrowRight, 
  Sparkles, 
  CheckCircle2,
  Star,
  ChevronRight,
  Briefcase,
  Users,
  ShoppingBag,
  GraduationCap,
  Lock,
  Zap,
  Layers,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EffectsGallery } from '@/components/home/EffectsGallery';
import { SUBSCRIPTIONS } from '@/lib/pricing-config';
import { getHomeCopy, renderWithBreaks } from '@/content/home';

const copy = getHomeCopy();

// ===== HERO =====
function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-16">
      {/* Abstract background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[600px]">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--gold)]/8 via-[var(--gold)]/3 to-transparent rounded-full blur-[120px]" />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(var(--border)_1px,transparent_1px),linear-gradient(90deg,var(--border)_1px,transparent_1px)] bg-[size:80px_80px] opacity-30" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6 text-[var(--text)]">
            {copy.hero.title}
          </h1>
          
          <p className="text-lg sm:text-xl text-[var(--text2)] mb-8 leading-relaxed max-w-2xl mx-auto">
            {renderWithBreaks(copy.hero.subtitle)}
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              asChild
              size="lg" 
              className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] font-semibold text-base h-12 px-8"
            >
              <Link href={copy.links.create}>
                {copy.hero.ctaPrimary}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
            <Button 
              asChild
              size="lg" 
              variant="outline"
              className="border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)] h-12 px-8"
            >
              <Link href={copy.links.inspiration}>
                {copy.hero.ctaSecondary}
              </Link>
            </Button>
          </div>

          {/* Trust line */}
          <p className="text-sm text-[var(--muted)]">
            {copy.hero.trustLine}
          </p>
        </div>
      </div>
    </section>
  );
}

// ===== BENEFITS =====
function Benefits() {
  const icons = [Sparkles, Layers, Settings2];
  
  return (
    <section className="py-16 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          {copy.benefits.items.map((item, i) => {
            const Icon = icons[i];
            return (
              <div 
                key={i}
                className="text-center p-6"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-6 h-6 text-[var(--gold)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text2)]">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ===== GALLERY WRAPPER =====
function GallerySection() {
  return (
    <section className="py-20 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text)] mb-4">
            {copy.gallery.title}
          </h2>
          <p className="text-[var(--muted)] max-w-xl mx-auto">
            {copy.gallery.subtitle}
          </p>
        </div>
      </div>
      <EffectsGallery />
    </section>
  );
}

// ===== MODELS =====
function Models() {
  return (
    <section className="py-20 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text)] mb-8">
            {copy.models.title}
          </h2>
          <div className="space-y-3">
            {copy.models.lines.map((line, i) => (
              <p 
                key={i} 
                className={`text-lg ${i === copy.models.lines.length - 1 ? 'text-[var(--gold)] font-medium mt-6' : 'text-[var(--text2)]'}`}
              >
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== HOW IT WORKS =====
function HowItWorks() {
  return (
    <section className="py-20 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text)] text-center mb-12">
            {copy.howItWorks.title}
          </h2>
          
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8">
            {copy.howItWorks.steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                {i > 0 && <ChevronRight className="w-5 h-5 text-[var(--muted)] hidden md:block" />}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[var(--gold)]/10 border border-[var(--gold)]/30 flex items-center justify-center text-[var(--gold)] font-bold">
                    {i + 1}
                  </div>
                  <span className="text-[var(--text)] font-medium">{step}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== FOR WHO =====
function ForWho() {
  const icons = [Users, Briefcase, ShoppingBag];
  
  return (
    <section className="py-20 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text)] text-center mb-12">
          {copy.forWho.title}
        </h2>
        
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {copy.forWho.items.map((item, i) => {
            const Icon = icons[i];
            return (
              <div 
                key={i}
                className="p-6 rounded-2xl bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--gold)]/30 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[var(--gold)]" />
                </div>
                <h3 className="text-lg font-semibold text-[var(--text)] mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-[var(--text2)]">
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ===== PRICING =====
function Pricing() {
  const displayPlans = SUBSCRIPTIONS.slice(0, 3);

  return (
    <section className="py-24 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text)] mb-4">
            {copy.pricing.title}
          </h2>
          <p className="text-[var(--muted)] text-lg max-w-xl mx-auto">
            {copy.pricing.subtitle}
          </p>
        </div>

        {/* Promo banner */}
        <div className="max-w-md mx-auto mb-12">
          <div className="p-4 rounded-xl bg-[var(--gold)]/10 border border-[var(--gold)]/30 text-center">
            <p className="text-sm text-[var(--gold)] font-medium">
              {renderWithBreaks(copy.pricing.promo)}
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-8">
          {displayPlans.map((plan) => (
            <div
              key={plan.id}
              className={`relative p-6 rounded-2xl transition-all ${
                plan.popular
                  ? 'bg-[var(--surface)] border-2 border-[var(--gold)] scale-105 shadow-lg'
                  : 'bg-[var(--surface)] border border-[var(--border)]'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-[var(--gold)] text-black text-xs font-bold rounded-full">
                  {plan.badge}
                </div>
              )}

              <div className="text-center mb-6 pt-2">
                <h3 className="font-bold text-[var(--text)] text-xl mb-3">{plan.name}</h3>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold text-[var(--text)]">
                    {plan.price.toLocaleString()}
                  </span>
                  <span className="text-[var(--muted)]">₽/мес</span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Star className="w-4 h-4 text-[var(--gold)] fill-[var(--gold)]" />
                  <span className="text-sm font-semibold text-[var(--gold)]">{plan.credits} ⭐</span>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.slice(0, 4).map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[var(--text2)]">
                    <CheckCircle2 className="w-4 h-4 text-[var(--gold)] mt-0.5 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className={`w-full ${
                  plan.popular
                    ? 'bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]'
                    : 'bg-[var(--surface2)] text-[var(--text)] hover:bg-[var(--border)]'
                }`}
              >
                <Link href={copy.links.pricing}>{copy.pricing.ctaPrimary}</Link>
              </Button>
            </div>
          ))}
        </div>

        {/* Secondary CTA */}
        <div className="text-center">
          <Button
            asChild
            variant="outline"
            className="border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)]"
          >
            <Link href={copy.links.pricing}>
              <Star className="w-4 h-4 mr-2 text-[var(--gold)]" />
              {copy.pricing.ctaSecondary}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ===== ACADEMY =====
function Academy() {
  return (
    <section className="py-20 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="p-8 rounded-2xl bg-gradient-to-b from-[var(--surface)] to-[var(--surface2)] border border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-[var(--gold)]/10 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-[var(--gold)]" />
              </div>
              <h2 className="text-2xl font-bold text-[var(--text)]">
                {copy.academy.title}
              </h2>
            </div>
            
            <p className="text-[var(--text2)] mb-4 leading-relaxed">
              {renderWithBreaks(copy.academy.subtitle)}
            </p>
            
            <p className="text-sm text-[var(--muted)] mb-6">
              <span className="text-[var(--gold)]">→</span> {copy.academy.forWho}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Button 
                asChild
                className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)]"
              >
                <Link href={copy.links.academy}>
                  {copy.academy.ctaPrimary}
                </Link>
              </Button>
              <Button 
                asChild
                variant="outline"
                className="border-[var(--border)] text-[var(--text)] hover:bg-[var(--surface2)]"
              >
                <Link href={copy.links.academy}>
                  {copy.academy.ctaSecondary}
                </Link>
              </Button>
            </div>

            <p className="text-xs text-[var(--muted)]">
              {copy.academy.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

// ===== PRIVACY =====
function Privacy() {
  return (
    <section className="py-16 border-t border-[var(--border)]">
      <div className="container mx-auto px-6">
        <div className="max-w-xl mx-auto text-center">
          <div className="w-12 h-12 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <Lock className="w-5 h-5 text-[var(--gold)]" />
          </div>
          <h3 className="text-xl font-semibold text-[var(--text)] mb-2">
            {copy.privacy.title}
          </h3>
          <p className="text-[var(--text2)]">
            {copy.privacy.text}
          </p>
        </div>
      </div>
    </section>
  );
}

// ===== FINAL CTA =====
function FinalCTA() {
  return (
    <section className="py-32 relative">
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="w-[600px] h-[300px] bg-[var(--gold)]/10 rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-[var(--text)] mb-4">
            {copy.finalCta.title}
          </h2>
          <p className="text-[var(--muted)] mb-8">
            {copy.finalCta.subtitle}
          </p>
          
          <Button 
            asChild
            size="lg" 
            className="bg-[var(--gold)] text-black hover:bg-[var(--gold-hover)] font-semibold text-base h-12 px-10"
          >
            <Link href={copy.links.create}>
              <Sparkles className="w-4 h-4 mr-2" />
              {copy.finalCta.cta}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

// ===== MAIN PAGE =====
export default function Home() {
  return (
    <main className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <Hero />
      <Benefits />
      <GallerySection />
      <Models />
      <HowItWorks />
      <ForWho />
      <Pricing />
      <Academy />
      <Privacy />
      <FinalCTA />
    </main>
  );
}
