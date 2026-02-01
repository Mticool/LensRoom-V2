import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0A0A0B',
          backgroundImage: 'radial-gradient(circle at 25% 25%, #1a1a2e 0%, transparent 50%), radial-gradient(circle at 75% 75%, #16213e 0%, transparent 50%)',
          fontFamily: 'Inter, sans-serif',
          padding: '60px',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #f59e0b 0%, #00D9FF 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '24px',
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              style={{ color: '#0A0A0B' }}
            >
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" fill="currentColor" />
            </svg>
          </div>
          <span
            style={{
              fontSize: '64px',
              fontWeight: 800,
              color: 'white',
              letterSpacing: '-0.02em',
            }}
          >
            LensRoom
          </span>
        </div>

        {/* Main headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.1,
              marginBottom: '20px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            <span>Nano Banana Pro</span>
            <span
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #00D9FF 100%)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              БЕЗЛИМИТ
            </span>
          </div>
          
          {/* Subheadline */}
          <div
            style={{
              fontSize: '32px',
              color: '#9CA3AF',
              marginBottom: '40px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <span>в тарифах Creator+ и Business</span>
          </div>
          
          {/* Features row */}
          <div
            style={{
              display: 'flex',
              gap: '32px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '100px',
                backgroundColor: 'rgba(205, 255, 0, 0.1)',
                border: '1px solid rgba(205, 255, 0, 0.3)',
              }}
            >
              <span style={{ fontSize: '28px', color: '#f59e0b', fontWeight: 600 }}>
                10+ AI моделей
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                borderRadius: '100px',
                backgroundColor: 'rgba(0, 217, 255, 0.1)',
                border: '1px solid rgba(0, 217, 255, 0.3)',
              }}
            >
              <span style={{ fontSize: '28px', color: '#00D9FF', fontWeight: 600 }}>
                50⭐ бесплатно
              </span>
            </div>
          </div>
          
          {/* Models */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '40px',
              fontSize: '24px',
              color: '#6B7280',
            }}
          >
            <span>Veo 3.1</span>
            <span>•</span>
            <span>Sora 2</span>
            <span>•</span>
            <span>Kling</span>
            <span>•</span>
            <span>Flux</span>
            <span>•</span>
            <span>и другие</span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
