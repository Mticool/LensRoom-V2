import { calcMotionControlCredits } from '../motion-control';

describe('Motion Control Billing', () => {
  it('calculates credits for 720p correctly', () => {
    const bill = calcMotionControlCredits(6, '720p', 'image');
    expect(bill.billableSeconds).toBe(6);
    expect(bill.creditsPerSecond).toBe(6);
    expect(bill.credits).toBe(36);
  });

  it('calculates credits for 1080p correctly', () => {
    const bill = calcMotionControlCredits(6, '1080p', 'video');
    expect(bill.billableSeconds).toBe(6);
    expect(bill.creditsPerSecond).toBe(9);
    expect(bill.credits).toBe(54);
  });

  it('clamps seconds by orientation max', () => {
    const imageBill = calcMotionControlCredits(22, '720p', 'image');
    expect(imageBill.billableSeconds).toBe(10);
    expect(imageBill.credits).toBe(60);

    const videoBill = calcMotionControlCredits(31, '1080p', 'video');
    expect(videoBill.billableSeconds).toBe(30);
    expect(videoBill.credits).toBe(270);
  });
});
