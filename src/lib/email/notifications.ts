/**
 * Email Notifications for Payments
 * 
 * Uses Resend for sending emails (set RESEND_API_KEY in env)
 * Falls back to console logging if not configured
 */

interface PaymentNotification {
  userEmail?: string;
  telegramUsername?: string;
  amount: number;
  currency: string;
  packageName: string;
  creditsAdded: number;
  paymentId: string;
}

interface AdminNotification {
  subject: string;
  body: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@lensroom.ru";
const FROM_EMAIL = process.env.FROM_EMAIL || "LensRoom <noreply@lensroom.ru>";

/**
 * Send email via Resend API
 */
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[Email] Would send to ${to}: ${subject}`);
    return true;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`[Email] Failed to send: ${error}`);
      return false;
    }

    console.log(`[Email] ✅ Sent to ${to}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Error sending:`, error);
    return false;
  }
}

/**
 * Notify user about successful payment
 */
export async function notifyUserPayment(notification: PaymentNotification): Promise<void> {
  const { userEmail, telegramUsername, amount, currency, packageName, creditsAdded, paymentId } = notification;

  // If no email, just log
  if (!userEmail) {
    console.log(`[Email] Payment notification for @${telegramUsername}: ${amount} ${currency} → ${creditsAdded}⭐`);
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0F0F10; color: #fff; padding: 40px; }
        .container { max-width: 500px; margin: 0 auto; background: #18181B; border-radius: 16px; padding: 32px; }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: bold; color: #00D9FF; }
        .title { font-size: 20px; font-weight: 600; margin: 16px 0 8px; }
        .subtitle { color: #A1A1AA; font-size: 14px; }
        .details { background: #27272A; border-radius: 12px; padding: 20px; margin: 24px 0; }
        .row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #3F3F46; }
        .row:last-child { border-bottom: none; }
        .label { color: #71717A; }
        .value { font-weight: 500; }
        .stars { color: #00D9FF; font-size: 18px; font-weight: bold; }
        .footer { text-align: center; margin-top: 24px; color: #71717A; font-size: 12px; }
        .button { display: inline-block; background: #00D9FF; color: #000; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">✨ LensRoom</div>
          <h1 class="title">Оплата прошла успешно!</h1>
          <p class="subtitle">Спасибо за покупку</p>
        </div>
        
        <div class="details">
          <div class="row">
            <span class="label">Пакет</span>
            <span class="value">${packageName}</span>
          </div>
          <div class="row">
            <span class="label">Сумма</span>
            <span class="value">${amount} ${currency}</span>
          </div>
          <div class="row">
            <span class="label">Начислено</span>
            <span class="stars">${creditsAdded} ⭐</span>
          </div>
        </div>
        
        <div style="text-align: center;">
          <a href="https://lensroom.ru/generator" class="button">Начать генерацию</a>
        </div>
        
        <div class="footer">
          <p>ID платежа: ${paymentId}</p>
          <p>© LensRoom — AI генерация фото и видео</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(userEmail, `Оплата ${amount} ${currency} — LensRoom`, html);
}

/**
 * Notify admin about new payment
 */
export async function notifyAdminPayment(notification: PaymentNotification): Promise<void> {
  const { telegramUsername, amount, currency, packageName, creditsAdded, paymentId } = notification;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; padding: 20px; }
        .container { max-width: 500px; background: #f5f5f5; border-radius: 8px; padding: 20px; }
        h2 { color: #10b981; margin-top: 0; }
        .row { padding: 8px 0; border-bottom: 1px solid #e5e5e5; }
        .label { color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h2>💰 Новый платёж!</h2>
        <div class="row"><span class="label">Пользователь:</span> @${telegramUsername || 'unknown'}</div>
        <div class="row"><span class="label">Сумма:</span> ${amount} ${currency}</div>
        <div class="row"><span class="label">Пакет:</span> ${packageName}</div>
        <div class="row"><span class="label">Звёзды:</span> ${creditsAdded} ⭐</div>
        <div class="row"><span class="label">ID:</span> ${paymentId}</div>
      </div>
    </body>
    </html>
  `;

  await sendEmail(ADMIN_EMAIL, `💰 Новый платёж ${amount} ${currency} от @${telegramUsername || 'user'}`, html);
}

/**
 * Send custom admin notification
 */
export async function notifyAdmin(notification: AdminNotification): Promise<void> {
  await sendEmail(ADMIN_EMAIL, notification.subject, `<pre>${notification.body}</pre>`);
}




