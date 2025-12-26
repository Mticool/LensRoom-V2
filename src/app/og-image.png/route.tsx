import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          height: '100%',
          backgroundColor: '#0A0A0A',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background gradients */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 800,
            height: 800,
            background: 'radial-gradient(circle, rgba(0,217,255,0.3) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30%',
            right: '-10%',
            width: 600,
            height: 600,
            background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '-10%',
            width: 500,
            height: 500,
            background: 'radial-gradient(circle, rgba(236,72,153,0.2) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        {/* Content container */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            padding: '60px',
            position: 'relative',
            zIndex: 10,
          }}
        >
          {/* Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 20px',
              borderRadius: 50,
              backgroundColor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.15)',
              marginBottom: 32,
            }}
          >
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                backgroundColor: '#00D9FF',
                boxShadow: '0 0 10px #00D9FF',
              }}
            />
            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: 20 }}>
              AI Генератор Контента
            </span>
          </div>

          {/* Main title */}
          <h1
            style={{
              fontSize: 80,
              fontWeight: 800,
              textAlign: 'center',
              lineHeight: 1.1,
              marginBottom: 20,
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#FFFFFF' }}>Создавайте </span>
            <span
              style={{
                background: 'linear-gradient(90deg, #00D9FF, #A78BFA, #EC4899)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              невероятный
            </span>
            <span style={{ color: '#FFFFFF' }}> контент</span>
          </h1>

          {/* Subtitle */}
          <p
            style={{
              fontSize: 28,
              color: 'rgba(255,255,255,0.6)',
              textAlign: 'center',
              marginBottom: 40,
              maxWidth: 800,
            }}
          >
            Фото и видео студийного качества за секунды
          </p>

          {/* Models row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 24,
              marginBottom: 40,
            }}
          >
            {[
              { name: 'Nano Banana Pro', color: '#22C55E' },
              { name: 'Veo 3.1', color: '#A78BFA' },
              { name: 'Kling 2.6', color: '#EC4899' },
              { name: 'Sora Pro', color: '#00D9FF' },
            ].map((model) => (
              <div
                key={model.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 16px',
                  borderRadius: 12,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${model.color}40`,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    backgroundColor: model.color,
                  }}
                />
                <span style={{ color: '#FFFFFF', fontSize: 18, fontWeight: 600 }}>
                  {model.name}
                </span>
              </div>
            ))}
          </div>

          {/* Bottom CTA style */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 32,
              padding: '16px 32px',
              borderRadius: 16,
              backgroundColor: 'rgba(0,217,255,0.1)',
              border: '1px solid rgba(0,217,255,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>⭐</span>
              <span style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 600 }}>
                50 бесплатно
              </span>
            </div>
            <div
              style={{
                width: 1,
                height: 24,
                backgroundColor: 'rgba(255,255,255,0.2)',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 24 }}>⚡</span>
              <span style={{ color: '#FFFFFF', fontSize: 20, fontWeight: 600 }}>
                Вход через Telegram
              </span>
            </div>
          </div>
        </div>

        {/* Logo/Brand */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 60,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #00D9FF, #A78BFA)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#000', fontSize: 28, fontWeight: 800 }}>L</span>
          </div>
          <span style={{ color: '#FFFFFF', fontSize: 28, fontWeight: 700 }}>
            LensRoom
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
