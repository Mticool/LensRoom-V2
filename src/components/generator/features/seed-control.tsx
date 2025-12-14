'use client';

import { Dices, Lock, Unlock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface SeedControlProps {
  value: number | null;
  onChange: (seed: number | null) => void;
  locked?: boolean;
  onLockChange?: (locked: boolean) => void;
}

export function SeedControl({ 
  value, 
  onChange, 
  locked = false,
  onLockChange 
}: SeedControlProps) {
  const [isLocked, setIsLocked] = useState(locked);
  const [copied, setCopied] = useState(false);

  const generateRandomSeed = () => {
    const newSeed = Math.floor(Math.random() * 2147483647);
    onChange(newSeed);
  };

  const toggleLock = () => {
    const newLocked = !isLocked;
    setIsLocked(newLocked);
    onLockChange?.(newLocked);
    
    // If unlocking, set to random
    if (!newLocked) {
      onChange(null);
    } else if (value === null) {
      generateRandomSeed();
    }
  };

  const copySeed = async () => {
    if (value !== null) {
      await navigator.clipboard.writeText(value.toString());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '') {
      onChange(null);
    } else {
      const num = parseInt(val);
      if (!isNaN(num) && num >= 0) {
        onChange(Math.min(num, 2147483647));
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Dices className="w-4 h-4" />
          Seed (зерно)
        </label>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className={cn(
            'h-7 px-2',
            isLocked && 'text-primary'
          )}
          onClick={toggleLock}
        >
          {isLocked ? (
            <>
              <Lock className="w-3 h-3 mr-1" />
              Зафиксирован
            </>
          ) : (
            <>
              <Unlock className="w-3 h-3 mr-1" />
              Случайный
            </>
          )}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {isLocked 
          ? 'Seed зафиксирован — результаты будут воспроизводимыми'
          : 'Seed случайный — каждая генерация будет уникальной'}
      </p>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            value={value ?? ''}
            onChange={handleInputChange}
            placeholder="Случайный"
            disabled={!isLocked}
            className={cn(
              'pr-10',
              !isLocked && 'opacity-50'
            )}
            min={0}
            max={2147483647}
          />
          {value !== null && isLocked && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={copySeed}
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          )}
        </div>

        {isLocked && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={generateRandomSeed}
            className="shrink-0"
          >
            <Dices className="w-4 h-4" />
          </Button>
        )}
      </div>

      {value !== null && isLocked && (
        <p className="text-xs text-muted-foreground">
          Текущий seed: <code className="bg-secondary px-1 rounded">{value}</code>
        </p>
      )}
    </div>
  );
}

