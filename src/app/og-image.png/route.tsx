import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: '#0a0a0b',
          backgroundImage: 'radial-gradient(circle at 50% 50%, #1a1a1d 0%, #0a0a0b 100%)',
        }}
      >
        {/* Logo circle */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 120,
            height: 120,
            borderRadius: '50%',
            border: '4px solid #d4af37',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              fontSize: 64,
              fontWeight: 'bold',
              color: '#d4af37',
            }}
          >
            L
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 72,
            fontWeight: 'bold',
            color: '#ffffff',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          LensRoom
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 32,
            color: '#d4af37',
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          AI Генератор Фото и Видео
        </p>

        {/* Features */}
        <div
          style={{
            display: 'flex',
            gap: 32,
            color: '#888888',
            fontSize: 24,
          }}
        >
          <span>Flux.2</span>
          <span>•</span>
          <span>Kling</span>
          <span>•</span>
          <span>Veo 3.1</span>
          <span>•</span>
          <span>Sora 2</span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}


