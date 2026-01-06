import { NextRequest, NextResponse } from 'next/server';

// Предгенерированные демо-изображения для каждого шаблона
// В продакшене можно подключить реальную генерацию с лимитами по IP
const DEMO_IMAGES: Record<string, string[]> = {
  portrait: [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=1024&h=1024&fit=crop',
  ],
  landscape: [
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1024&h=1024&fit=crop',
  ],
  cyber: [
    'https://images.unsplash.com/photo-1545486332-9e0999c535b2?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1515630278258-407f66498911?w=1024&h=1024&fit=crop',
  ],
  fantasy: [
    'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1507400492013-162706c8c05e?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=1024&h=1024&fit=crop',
  ],
  product: [
    'https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1541643600914-78b084683601?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=1024&h=1024&fit=crop',
  ],
  anime: [
    'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1024&h=1024&fit=crop',
    'https://images.unsplash.com/photo-1560972550-aba3456b5564?w=1024&h=1024&fit=crop',
  ],
};

/**
 * Demo generation endpoint
 * Returns pre-generated images for quick showcase
 * In production: implement rate limiting by IP and actual generation
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId } = body;

    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

    // Get random image for template
    const images = DEMO_IMAGES[templateId] || DEMO_IMAGES.portrait;
    const randomImage = images[Math.floor(Math.random() * images.length)];

    return NextResponse.json({
      success: true,
      data: {
        url: randomImage,
        isDemo: true,
      },
    });

  } catch (error) {
    console.error('[Demo Generate] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate demo' },
      { status: 500 }
    );
  }
}







