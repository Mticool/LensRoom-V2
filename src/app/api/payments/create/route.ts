import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getProdamusClient } from '@/lib/payments/prodamus-client';
import { CREDIT_PACKAGES } from '@/lib/pricing/plans';
import { integrationNotConfigured } from "@/lib/http/integration-error";

export async function POST(request: NextRequest) {
  try {
    const { credits } = await request.json();

    // Validate credits package
    const package_ = CREDIT_PACKAGES.find(p => p.credits === credits);
    if (!package_) {
      return NextResponse.json(
        { error: 'Invalid credits package', availablePackages: CREDIT_PACKAGES.map(p => p.credits) },
        { status: 400 }
      );
    }

    // Check auth
    const supabase = await createServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server error' },
        { status: 500 }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate order number
    const orderNumber = `LR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create payment link
    const prodamus = getProdamusClient();
    if (!prodamus) {
      return integrationNotConfigured("prodamus", ["PRODAMUS_SECRET_KEY", "PRODAMUS_PROJECT_ID"]);
    }

    const paymentUrl = prodamus.createPaymentLink({
      orderNumber,
      amount: package_.price,
      customerEmail: user.email || '',
      credits: package_.credits,
      userId: user.id,
    });

    console.log('[Payments] Created payment:', {
      orderNumber,
      userId: user.id,
      credits: package_.credits,
      amount: package_.price,
    });

    return NextResponse.json({
      success: true,
      paymentUrl,
      orderNumber,
      credits: package_.credits,
      amount: package_.price,
    });
  } catch (error) {
    console.error('[Payments] Error creating payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}