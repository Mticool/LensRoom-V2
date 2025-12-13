import { NextRequest, NextResponse } from 'next/server';
import { prodamusClient } from '@/lib/payments/prodamus-client';
import { createServerSupabaseClient } from '@/lib/supabase/server';

interface ProdamusWebhookData {
  order_id: string;
  sum: string;
  currency: string;
  customer_email: string;
  customer_extra: string; // userId
  payment_status: string;
  sign: string;
  products?: string;
  subscription_id?: string;
  // Custom fields
  'custom_fields[plan_id]'?: string;
  'custom_fields[credits_per_month]'?: string;
}

function parseCreditsFromProducts(products: string | undefined): number {
  if (!products) return 0;
  
  try {
    // Try to parse credits from product name like "500 кредитов LensRoom"
    const match = products.match(/(\d+)\s*кредит/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  } catch {
    // Ignore parsing errors
  }
  
  return 0;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const data: Record<string, string> = {};
    
    formData.forEach((value, key) => {
      data[key] = value.toString();
    });

    console.log('[Prodamus Webhook] Received:', data);

    // Get signature from data
    const receivedSignature = data.sign || data.signature || '';
    
    // Remove signature from data before verification
    const dataWithoutSign = { ...data };
    delete dataWithoutSign.sign;
    delete dataWithoutSign.signature;

    // Verify signature
    const isValid = prodamusClient.verifyWebhookSignature(dataWithoutSign, receivedSignature);
    
    if (!isValid) {
      console.error('[Prodamus Webhook] Invalid signature');
      // For debugging, continue anyway in development
      if (process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
      }
      console.warn('[Prodamus Webhook] Skipping signature check in development');
    }

    // Parse webhook data
    const webhookData = data as unknown as ProdamusWebhookData;
    const paymentStatus = webhookData.payment_status?.toLowerCase();
    
    // Check payment status
    if (paymentStatus !== 'success' && paymentStatus !== 'paid') {
      console.log('[Prodamus Webhook] Payment not successful:', paymentStatus);
      return NextResponse.json({ status: 'ignored', reason: 'Payment not successful' });
    }

    const userId = webhookData.customer_extra;
    const amount = parseFloat(webhookData.sum) || 0;
    const subscriptionId = webhookData.subscription_id;
    const planId = webhookData['custom_fields[plan_id]'];
    
    // Calculate credits
    let credits = 0;
    
    if (planId && webhookData['custom_fields[credits_per_month]']) {
      // Subscription payment
      credits = parseInt(webhookData['custom_fields[credits_per_month]'], 10);
    } else {
      // Package payment - parse from products
      credits = parseCreditsFromProducts(webhookData.products);
      
      // Fallback: calculate from amount
      if (credits === 0) {
        // Approximate credits based on our pricing
        if (amount >= 2490) credits = 3000;
        else if (amount >= 1190) credits = 1200;
        else if (amount >= 599) credits = 500;
        else if (amount >= 299) credits = 200;
      }
    }

    console.log('[Prodamus Webhook] Parsed payment:', {
      userId,
      credits,
      amount,
      subscriptionId,
      planId,
    });

    // Add credits to user
    if (userId && credits > 0) {
      const supabase = await createServerSupabaseClient();
      
      if (supabase) {
        // Get current credits
        const { data: creditsData } = await supabase
          .from('credits')
          .select('amount')
          .eq('user_id', userId)
          .single();

        const currentCredits = creditsData?.amount || 0;
        const newCredits = currentCredits + credits;

        // Update credits
        const { error: updateError } = await supabase
          .from('credits')
          .update({ 
            amount: newCredits,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        if (updateError) {
          console.error('[Prodamus Webhook] Error updating credits:', updateError);
          return NextResponse.json({ error: 'Failed to add credits' }, { status: 500 });
        }

        // Record transaction
        const transactionType = subscriptionId ? 'subscription' : 'purchase';
        const description = subscriptionId 
          ? `Подписка ${planId}: ${credits} кредитов`
          : `Покупка ${credits} кредитов (${amount}₽)`;

        await supabase.from('credit_transactions').insert({
          user_id: userId,
          amount: credits,
          type: transactionType,
          description,
          metadata: {
            order_id: webhookData.order_id,
            subscription_id: subscriptionId,
            plan_id: planId,
            payment_amount: amount,
          },
        });

        // Update user subscription if it's a subscription payment
        if (subscriptionId && planId) {
          await supabase
            .from('profiles')
            .update({
              plan: planId,
              subscription_id: subscriptionId,
              subscription_status: 'active',
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }

        console.log('[Prodamus Webhook] Credits added:', {
          userId,
          credits,
          newBalance: newCredits,
          subscriptionId,
        });
      }
    }

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('[Prodamus Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Also handle GET for verification
export async function GET() {
  return NextResponse.json({ status: 'Prodamus webhook endpoint active' });
}
