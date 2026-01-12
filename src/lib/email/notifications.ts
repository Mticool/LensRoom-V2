// Email notifications - placeholder functions
// These can be implemented later with actual email sending

export async function notifyUserPayment(params: {
  userId?: string;
  telegramUsername?: string;
  amount: number;
  type?: string;
  stars?: number;
  currency?: string;
  packageName?: string;
  creditsAdded?: number;
  paymentId?: string;
}) {
  // TODO: Implement email notification to user about payment
  console.log('[Notifications] User payment:', params);
}

export async function notifyAdminPayment(params: {
  userId?: string;
  telegramUsername?: string;
  amount: number;
  type?: string;
  stars?: number;
  orderId?: string;
  currency?: string;
  packageName?: string;
  creditsAdded?: number;
  paymentId?: string;
}) {
  // TODO: Implement email/Telegram notification to admin about payment
  console.log('[Notifications] Admin payment notification:', params);
}
