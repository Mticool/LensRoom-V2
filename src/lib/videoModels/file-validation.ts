import type { ModelCapability } from './schema';

type FileConstraintRule = {
  formats?: string[];
  maxSizeMb?: number;
};

const MIME_EXT_ALIASES: Record<string, string> = {
  'quicktime': 'mov',
  'x-quicktime': 'mov',
  'x-m4v': 'mp4',
  'x-msvideo': 'avi',
  'mpeg': 'mpg',
  'x-matroska': 'mkv',
  'svg+xml': 'svg',
};

function normalizeMimeExtension(mime: string): string {
  const lower = mime.toLowerCase();
  const subtype = lower.split('/')[1] || '';
  if (!subtype) return '';
  const baseSubtype = subtype.split(';')[0].trim();
  return MIME_EXT_ALIASES[baseSubtype] || baseSubtype;
}

function estimateBase64SizeMb(base64Data: string): number {
  const sizeBytes = Math.ceil((base64Data.length * 3) / 4);
  return sizeBytes / (1024 * 1024);
}

export function validateCapabilityDataUrl(
  dataUrl: string,
  key: string,
  capability?: ModelCapability
): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;

  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    return `Invalid data URL for ${key}`;
  }

  const mime = match[1] || '';
  const base64 = match[2] || '';
  const extension = normalizeMimeExtension(mime);
  const sizeMb = estimateBase64SizeMb(base64);
  const rules = (capability?.fileConstraints?.[key] || {}) as FileConstraintRule;

  if (rules.formats && rules.formats.length > 0) {
    const allowed = rules.formats.map((f) => f.toLowerCase());
    if (!allowed.includes(extension)) {
      return `Invalid ${key} format '${extension}'. Allowed: ${allowed.join(', ')}`;
    }
  }

  if (rules.maxSizeMb && sizeMb > rules.maxSizeMb) {
    return `File too large for ${key} (${sizeMb.toFixed(1)} MB). Max: ${rules.maxSizeMb} MB`;
  }

  return null;
}
