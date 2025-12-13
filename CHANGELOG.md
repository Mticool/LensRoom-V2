# Changelog

All notable changes to LensRoom will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-13

### 🎉 Initial Release

#### Added

**Core Features**
- 🎨 Photo generator with 6 AI models (Flux.2, Seedream 4.5, Nano Banana Pro, Z-Image, and more)
- 🎬 Video generator with 6 AI models (Sora 2, Sora 2 Pro, Kling 2.6, Veo 3.1, Seedance)
- 📦 Product cards batch processing for marketplaces
- 📚 Prompt library with 500+ ready-to-use prompts
- 🖼️ Inspiration gallery with community works

**Generator Features**
- Model selection with detailed info
- Prompt editor with character counter
- Aspect ratio selection (1:1, 16:9, 9:16, 4:3)
- Multiple variants generation (1-4)
- Advanced settings (seed, CFG scale, steps, negative prompt)
- Real-time progress tracking
- History panel with favorites
- Download functionality (single image, ZIP archive, video)

**Video Specific**
- Text-to-video and Image-to-video modes
- Duration selection (5s, 10s, 20s)
- Camera movement presets
- Motion intensity control
- FPS selection (24, 30, 60)
- Image upload for I2V

**Product Cards**
- Multi-image upload (up to 50)
- 10 background styles
- Processing options (remove bg, lighting, shadows, reflection)
- Variants per product (1, 4, 8, 16)
- Before/After comparison
- Batch download

**UI/UX**
- Premium dark theme design
- Mobile responsive layout
- Keyboard shortcuts (Cmd+Enter to generate)
- Toast notifications
- Error boundaries
- Loading states with skeletons
- Smooth animations (Framer Motion)

**Pages**
- Homepage with hero and features
- Photo generator (/create)
- Video generator (/create/video)
- Product cards (/create/products)
- Prompt library (/library)
- Inspiration gallery (/inspiration)
- Pricing page (/pricing)
- API test page (/test-api)

**SEO**
- Open Graph meta tags
- Twitter cards
- JSON-LD schema
- Sitemap generation
- robots.txt

**Technical**
- Next.js 15 with App Router
- TypeScript strict mode
- Tailwind CSS 4
- Zustand state management
- React Query for server state
- Radix UI primitives
- kie.ai API integration
- Mock mode for development
- Retry mechanism with exponential backoff

### Tech Stack

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **State**: Zustand + React Query
- **Animations**: Framer Motion
- **UI**: Radix UI
- **API**: kie.ai
- **Icons**: Lucide React

---

## [0.1.0] - 2025-12-01

### Added
- Initial project setup
- Basic folder structure
- Core dependencies installation
- Design system foundation

---

## Future Plans

### [1.1.0] - Planned
- [ ] User authentication (Supabase)
- [ ] Payment integration (Stripe)
- [ ] User dashboard
- [ ] Generation history sync
- [ ] Team workspaces
- [ ] Custom model fine-tuning

### [1.2.0] - Planned
- [ ] API for developers
- [ ] Webhooks support
- [ ] Batch API processing
- [ ] Advanced analytics

### [2.0.0] - Planned
- [ ] AI Photo Editor
- [ ] AI Video Editor
- [ ] Custom templates
- [ ] Brand kit management

