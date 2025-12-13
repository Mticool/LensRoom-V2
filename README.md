# LensRoom - AI Content Generation Platform

<div align="center">
  <img src="public/og-image.png" alt="LensRoom" width="600" />
  
  **12 лучших AI моделей для фото и видео в одном месте**

  [Demo](https://lensroom.ru) · [Documentation](https://docs.lensroom.ru) · [API](https://api.lensroom.ru)
</div>

---

## ✨ Features

- 🎨 **AI Photo Generation**: 6 моделей (Flux.2, Seedream 4.5, Nano Banana Pro, Z-Image, и др.)
- 🎬 **AI Video Generation**: 6 моделей (Sora 2 Pro, Kling 2.6, Veo 3.1, Seedance, и др.)
- 📦 **Product Cards**: Batch обработка для маркетплейсов (WB, Ozon, Яндекс.Маркет)
- 📚 **Prompt Library**: 500+ готовых промптов для всех задач
- 🎨 **Inspiration Gallery**: Примеры работ сообщества
- 📱 **Responsive Design**: Адаптивный интерфейс для всех устройств
- 🌙 **Dark Theme**: Премиальный тёмный дизайн

## 🛠 Tech Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 15 (App Router) |
| **Language** | TypeScript (strict mode) |
| **Styling** | Tailwind CSS 4 |
| **State** | Zustand + React Query |
| **Animations** | Framer Motion |
| **UI Components** | Radix UI + shadcn/ui |
| **API** | kie.ai |
| **Icons** | Lucide React |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- kie.ai API key ([Get one here](https://kie.ai/api-key))

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/lensroom.git
cd lensroom

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Add your API key to .env.local
# KIE_API_KEY=your_api_key_here

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
# Build
npm run build

# Start production server
npm start

# Or deploy to Vercel
npm run deploy
```

## 🔧 Environment Variables

Create a `.env.local` file with the following variables:

```env
# Required
KIE_API_KEY=your_kie_api_key_here
NEXT_PUBLIC_KIE_API_URL=https://api.kie.ai

# Optional
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_MOCK_MODE=false

# Future integrations
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── create/            # Generator pages
│   │   ├── page.tsx       # Photo generator
│   │   ├── video/         # Video generator
│   │   └── products/      # Product cards
│   ├── library/           # Prompt library
│   ├── inspiration/       # Gallery
│   └── pricing/           # Pricing page
├── components/            # React components
│   ├── ui/               # Base UI components
│   ├── layout/           # Header, Footer
│   ├── generator/        # Generator components
│   ├── library/          # Library components
│   └── video/            # Video components
├── lib/                  # Utilities
│   ├── api/             # API clients
│   └── utils.ts         # Helper functions
├── stores/              # Zustand stores
├── hooks/               # Custom React hooks
├── types/               # TypeScript types
├── data/                # Mock data
└── styles/              # Global styles
```

## 🚢 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/lensroom&env=KIE_API_KEY,NEXT_PUBLIC_KIE_API_URL)

1. Click the button above
2. Add environment variables:
   - `KIE_API_KEY` - Your kie.ai API key
   - `NEXT_PUBLIC_KIE_API_URL` - https://api.kie.ai
3. Deploy!

## 📖 API Documentation

### Photo Generation

```typescript
import { kieClient } from '@/lib/api/kie-client';

const result = await kieClient.generateImage({
  model: 'flux-2',
  prompt: 'a beautiful sunset over mountains',
  width: 1024,
  height: 1024,
  numOutputs: 1,
});
```

### Video Generation

```typescript
const result = await kieClient.generateVideo({
  model: 'sora-2',
  prompt: 'waves crashing on a beach',
  duration: 5,
  width: 1280,
  height: 720,
});
```

## 🧪 Testing

```bash
# Run linter
npm run lint

# Type check
npm run type-check

# Test API connection
# Open http://localhost:3000/test-api
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

- Website: [lensroom.ru](https://lensroom.ru)
- Email: support@lensroom.ru
- Telegram: [@lensroom](https://t.me/lensroom)

---

<div align="center">
  Made with ❤️ by LensRoom Team
</div>
# Deployed on Vercel