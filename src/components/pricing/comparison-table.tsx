'use client';

import { Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';

const COMPARISON = [
  {
    feature: 'Звёзды в месяц',
    star: '250 ⭐',
    pro: '800 ⭐',
    business: '2500 ⭐',
  },
  {
    feature: 'Все модели',
    star: true,
    pro: true,
    business: true,
  },
  {
    feature: 'Без watermark',
    star: true,
    pro: true,
    business: true,
  },
  {
    feature: 'История генераций',
    star: '30 дней',
    pro: '90 дней',
    business: 'Безлимит',
  },
  {
    feature: 'Приоритетная генерация',
    star: false,
    pro: true,
    business: true,
  },
  {
    feature: 'Priority support',
    star: false,
    pro: true,
    business: true,
  },
  {
    feature: 'API доступ',
    star: false,
    pro: false,
    business: true,
  },
  {
    feature: 'Batch processing',
    star: false,
    pro: false,
    business: true,
  },
  {
    feature: 'Custom integrations',
    star: false,
    pro: false,
    business: true,
  },
];

export function ComparisonTable() {
  return (
    <Card className="overflow-hidden bg-white/[0.02] border-white/10">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-medium text-white">
                Возможности
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-white">
                Star
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-white bg-[#c8ff00]/5">
                Pro
              </th>
              <th className="px-6 py-4 text-center text-sm font-medium text-white">
                Business
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {COMPARISON.map((row, index) => (
              <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-white">
                  {row.feature}
                </td>
                <td className="px-6 py-4 text-center">
                  {typeof row.star === 'boolean' ? (
                    row.star ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-white/20 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm text-white/60">{row.star}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center bg-[#c8ff00]/5">
                  {typeof row.pro === 'boolean' ? (
                    row.pro ? (
                      <Check className="w-5 h-5 text-[#c8ff00] mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-white/20 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm font-medium text-[#c8ff00]">{row.pro}</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  {typeof row.business === 'boolean' ? (
                    row.business ? (
                      <Check className="w-5 h-5 text-green-500 mx-auto" />
                    ) : (
                      <X className="w-5 h-5 text-white/20 mx-auto" />
                    )
                  ) : (
                    <span className="text-sm text-white/60">{row.business}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
