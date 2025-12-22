/**
 * API: Проверка лимитов пользователя
 * GET /api/limits/check
 * 
 * Возвращает информацию о текущем использовании и доступных лимитах
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSession, getAuthUserId } from '@/lib/telegram/auth';

export interface LimitsCheckResponse {
  hasSubscription: boolean;
  subscriptionTier: string;
  usage: {
    nanoBanana: {
      used: number;
      limit: number | 'unlimited';
      available: boolean;
      remaining?: number;
    };
    nanoPro: {
      used: number;
      limit: number;
      available: boolean;
      remaining?: number;
    };
    tools: {
      used: number;
      limit: number | 'unlimited';
      available: boolean;
      remaining?: number;
    };
  };
  shouldUpsell: boolean;
  upsellReason?: string;
  upsellCTA?: {
    title: string;
    description: string;
    action: string;
    href: string;
  };
}

export async function GET(request: NextRequest) {
  try {
    // Проверка авторизации
    const telegramSession = await getSession();
    if (!telegramSession) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const userId = await getAuthUserId(telegramSession);
    if (!userId) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Вызов SQL функции для проверки лимитов
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('check_user_limits', {
      user_uuid: userId
    });

    if (error) {
      console.error('[API] Error checking limits:', error);
      return NextResponse.json(
        { error: 'Failed to check limits' },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data returned' },
        { status: 500 }
      );
    }

    const limits = data[0];

    // Форматирование ответа
    const response: LimitsCheckResponse = {
      hasSubscription: limits.has_subscription,
      subscriptionTier: limits.subscription_tier,
      usage: {
        nanoBanana: {
          used: Number(limits.nano_banana_used),
          limit: limits.nano_banana_limit === 'unlimited' 
            ? 'unlimited' 
            : Number(limits.nano_banana_limit),
          available: limits.nano_banana_available,
          remaining: limits.nano_banana_limit === 'unlimited'
            ? undefined
            : Math.max(0, Number(limits.nano_banana_limit) - Number(limits.nano_banana_used))
        },
        nanoPro: {
          used: Number(limits.nano_pro_used),
          limit: Number(limits.nano_pro_limit),
          available: limits.nano_pro_available,
          remaining: Math.max(0, Number(limits.nano_pro_limit) - Number(limits.nano_pro_used))
        },
        tools: {
          used: Number(limits.tools_used),
          limit: limits.tools_limit === 'unlimited'
            ? 'unlimited'
            : Number(limits.tools_limit),
          available: limits.tools_available,
          remaining: limits.tools_limit === 'unlimited'
            ? undefined
            : Math.max(0, Number(limits.tools_limit) - Number(limits.tools_used))
        }
      },
      shouldUpsell: limits.should_upsell,
      upsellReason: limits.upsell_reason
    };

    // Добавить CTA если нужен upsell
    if (limits.should_upsell) {
      response.upsellCTA = {
        title: '🚀 Достигнут лимит бесплатного тарифа',
        description: limits.upsell_reason || 'Переходите на платный тариф для продолжения работы',
        action: 'Выбрать тариф',
        href: '/pricing'
      };
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'no-store, max-age=0'
      }
    });

  } catch (error) {
    console.error('[API] Limits check error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

