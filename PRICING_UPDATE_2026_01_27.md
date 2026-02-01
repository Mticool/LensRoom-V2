# 🎯 Pricing System Update - January 27, 2026

## Overview

Complete overhaul of the pricing system to use SKU-based atomic pricing with STAR (⭐) values as the single source of truth. No more currency conversions or credit calculations - just fixed STAR prices per SKU.

## What Changed

### 1. New Pricing System (`src/lib/pricing/pricing.ts`)

**Core Functions:**
- `getSkuFromRequest(modelId, options)` → Returns SKU string (e.g., "nano_banana_pro:2k")
- `getPriceStars(sku)` → Returns exact star price for SKU
- `calculateTotalStars(sku, duration?)` → Returns total stars (handles per-second pricing)
- `PRICING_VERSION = "2026-01-27"` → Version constant for audit trails

**SKU Format Examples:**
```
IMAGE:
- nano_banana:image = 9⭐
- nano_banana_pro:2k = 17⭐
- nano_banana_pro:4k = 25⭐
- flux_2_pro:1k = 10⭐
- grok_imagine:i2i_run = 5⭐

VIDEO (FIXED):
- veo_3_1_fast:clip = 50⭐
- sora_2:clip = 50⭐
- grok_video:6s = 34⭐

VIDEO (VARIANTS):
- kling_2_6:5s:720p:no_audio = 92⭐
- kling_2_6:10s:720p:audio = 367⭐
- kling_2_5:5s:1080p = 105⭐
- kling_2_1:pro:10s = 167⭐
- wan_2_6:1080p:15s = 700⭐

MOTION CONTROL (PER SECOND):
- kling_motion_control:720p:per_sec = 10⭐
- kling_motion_control:1080p:per_sec = 20⭐
```

### 2. Updated Components

#### API Routes
✅ **Photo Generation** (`src/app/api/generate/photo/route.ts`)
- Uses new SKU-based pricing
- Adds `sku`, `charged_stars`, `pricing_version` to generation records
- Enhanced audit logging with SKU tracking

✅ **Video Generation** (`src/app/api/generate/video/route.ts`)
- Uses new SKU-based pricing for all video models
- Motion Control now uses fixed per-second rates (10⭐/20⭐ instead of 16⭐/25⭐)
- Adds `sku`, `charged_stars`, `pricing_version` to generation records
- Enhanced audit logging with SKU tracking

#### UI Components
✅ **Cost Calculation Hook** (`src/components/generator-v2/hooks/useCostCalculation.ts`)
- Updated to use new pricing system
- Returns SKU along with stars
- Shows correct prices in UI

#### Pricing Configuration
✅ **Nano Banana Pro** (`src/lib/quota/nano-banana-pro.ts`)
- Updated prices: 2K = 17⭐ (was 30⭐), 4K = 25⭐ (was 40⭐)
- Plan entitlements updated to match

✅ **Motion Control** (`src/lib/pricing/motionControl.ts`)
- Updated rates: 720p = 10⭐/sec (was 16⭐), 1080p = 20⭐/sec (was 25⭐)
- Simplified calculation (no rounding)

✅ **Subscription Plans** (`src/config/pricing.ts`)
- Updated Nano Banana Pro entitlement prices
- Added deprecation notice for old pricing structures

### 3. Database Migration

**File:** `supabase/migrations/20260127_add_pricing_audit_columns.sql`

**New Columns:**
```sql
-- generations table
ALTER TABLE generations ADD COLUMN:
- charged_stars INTEGER      -- Actual stars charged (may be 0 if included)
- sku VARCHAR(255)            -- SKU identifier (e.g., "kling_2_6:5s:720p:audio")
- pricing_version VARCHAR(50) -- Version used (e.g., "2026-01-27")

-- credit_transactions table
ALTER TABLE credit_transactions ADD COLUMN:
- sku VARCHAR(255)            -- SKU identifier
- pricing_version VARCHAR(50) -- Version used
```

**Indexes Added:**
- `idx_generations_sku`
- `idx_generations_pricing_version`
- `idx_credit_transactions_sku`
- `idx_credit_transactions_pricing_version`

### 4. Deprecated Files

The following files are kept for backwards compatibility but should NOT be used for new pricing calculations:

⚠️ **DEPRECATED:**
- `src/config/models.ts` - Model pricing structures (kept for API configs only)
- `src/lib/pricing/compute-price.ts` - Old credit calculation system

## Price Comparison Table

### Image Models
| Model | Old Price | NEW Price | Change |
|-------|-----------|-----------|--------|
| Nano Banana | 7⭐ | 9⭐ | +2⭐ |
| Nano Banana Pro 2K | 30⭐ | 17⭐ | **-13⭐** |
| Nano Banana Pro 4K | 40⭐ | 25⭐ | **-15⭐** |
| Seedream 4.5 | 11⭐ | 10⭐ | -1⭐ |
| Z-Image | 5⭐ | 5⭐ | Same |
| GPT Image 1.5 Medium | 5⭐ | 5⭐ | Same |
| GPT Image 1.5 High | 35⭐ | 35⭐ | Same |
| Flux 2 Pro 1K | 10⭐ | 10⭐ | Same |
| Flux 2 Pro 2K | 12⭐ | 12⭐ | Same |
| Grok Imagine | 5⭐ | 5⭐ | Same |

### Video Models (Fixed Duration)
| Model | Old Price | NEW Price | Change |
|-------|-----------|-----------|--------|
| Veo 3.1 Fast | 99⭐ | 50⭐ | **-49⭐** |
| Sora 2 | 50⭐ | 50⭐ | Same |
| Grok Video 6s | 34⭐ | 34⭐ | Same |

### Video Models (Variants - Example Comparisons)
| Model/Variant | Old Price | NEW Price | Change |
|---------------|-----------|-----------|--------|
| Kling 2.6 5s 720p no audio | ~105⭐ | 92⭐ | **-13⭐** |
| Kling 2.6 5s 720p audio | ~135⭐ | 184⭐ | +49⭐ |
| Kling 2.5 5s 720p | 105⭐ | 70⭐ | **-35⭐** |
| Kling 2.5 5s 1080p | ~200⭐ | 105⭐ | **-95⭐** |
| Kling 2.1 Pro 5s | 200⭐ | 84⭐ | **-116⭐** |
| WAN 2.6 720p 5s | ~100⭐ | 117⭐ | +17⭐ |
| WAN 2.6 1080p 15s | ~700⭐ | 700⭐ | Same |

### Motion Control (Per Second)
| Resolution | Old Rate | NEW Rate | Change |
|------------|----------|----------|--------|
| 720p | 16⭐/sec | 10⭐/sec | **-6⭐/sec** |
| 1080p | 25⭐/sec | 20⭐/sec | **-5⭐/sec** |

**Example:** 10-second 720p motion control video
- Old: 160⭐ (rounded to nearest 5)
- New: 100⭐
- Savings: **60⭐ (37.5%)**

## Smoke Test Instructions

### Prerequisites
1. Apply database migration:
   ```bash
   cd lensroom-v2
   # Apply migration to your Supabase instance
   psql $DATABASE_URL < supabase/migrations/20260127_add_pricing_audit_columns.sql
   ```

2. Restart development server:
   ```bash
   npm run dev
   ```

### Test 1: Photo Generation - Nano Banana
**Expected:** 9⭐

1. Open photo generator
2. Select "Nano Banana" model
3. Check displayed price: Should show **9⭐**
4. Generate an image
5. Check database:
   ```sql
   SELECT charged_stars, sku, pricing_version 
   FROM generations 
   WHERE user_id = 'YOUR_USER_ID' 
   ORDER BY created_at DESC LIMIT 1;
   ```
   **Expected:**
   - `charged_stars = 9`
   - `sku = 'nano_banana:image'`
   - `pricing_version = '2026-01-27'`

### Test 2: Photo Generation - Nano Banana Pro 2K
**Expected:** 17⭐ (or 0⭐ if included in Creator+/Business plan)

1. Select "Nano Banana Pro" model, 2K quality
2. Check displayed price: Should show **17⭐**
3. Generate an image
4. Check database - should show `charged_stars = 17` (or 0 if plan includes it)

### Test 3: Video Generation - Kling 2.6 (5s, 720p, no audio)
**Expected:** 92⭐

1. Open video generator
2. Select "Kling 2.6" model
3. Set: Duration = 5s, Resolution = 720p, Audio = OFF
4. Check displayed price: Should show **92⭐**
5. Generate video
6. Check database:
   ```sql
   SELECT charged_stars, sku, pricing_version 
   FROM generations 
   WHERE user_id = 'YOUR_USER_ID' 
   AND type = 'video'
   ORDER BY created_at DESC LIMIT 1;
   ```
   **Expected:**
   - `charged_stars = 92`
   - `sku = 'kling_2_6:5s:720p:no_audio'`
   - `pricing_version = '2026-01-27'`

### Test 4: Video Generation - Motion Control (10s, 720p)
**Expected:** 100⭐ (10⭐/sec × 10s)

1. Select "Kling Motion Control" model
2. Set: Duration = 10s, Resolution = 720p
3. Check displayed price: Should show **100⭐**
4. Generate video
5. Check database - should show `charged_stars = 100`, `sku = 'kling_motion_control:720p:per_sec'`

### Test 5: Credit Transactions Audit Trail

After any generation, check credit_transactions:
```sql
SELECT 
  amount, 
  type, 
  sku, 
  pricing_version, 
  description,
  created_at
FROM credit_transactions 
WHERE user_id = 'YOUR_USER_ID' 
ORDER BY created_at DESC 
LIMIT 5;
```

**Expected:**
- Each deduction has negative `amount`
- `sku` matches the generation SKU
- `pricing_version = '2026-01-27'`

### Test 6: Balance Deduction Accuracy

1. Note starting balance
2. Generate with known price (e.g., Nano Banana = 9⭐)
3. Check new balance
4. Verify: `old_balance - charged_stars = new_balance`

### Test 7: UI Price Display Consistency

For each model variant:
1. Check price shown in model picker
2. Check price shown on "Generate" button
3. Perform generation
4. Verify deducted amount matches displayed price

## Audit Logs

All generations now log enhanced audit information (when `NODE_ENV=development` or `AUDIT_STARS=true`):

```json
{
  "userId": "user_123",
  "modelId": "nano-banana-pro",
  "sku": "nano_banana_pro:2k",
  "pricingVersion": "2026-01-27",
  "priceStars": 17,
  "deductedFromSubscription": 17,
  "deductedFromPackage": 0,
  "balanceBefore": 100,
  "balanceAfter": 83,
  "isIncludedByPlan": false,
  "timestamp": "2026-01-27T10:30:00.000Z"
}
```

## Migration Checklist

- [x] Create new pricing system (`src/lib/pricing/pricing.ts`)
- [x] Update photo generation API route
- [x] Update video generation API route
- [x] Update UI cost calculation hook
- [x] Update Nano Banana Pro quota/pricing
- [x] Update motion control pricing
- [x] Add database migration for audit columns
- [x] Mark old pricing systems as deprecated
- [x] Add audit logging with SKU tracking
- [x] Create documentation and smoke test instructions

## Rollback Plan

If issues are discovered:

1. **Revert API routes:**
   ```bash
   git checkout HEAD~1 -- src/app/api/generate/photo/route.ts
   git checkout HEAD~1 -- src/app/api/generate/video/route.ts
   ```

2. **Revert UI:**
   ```bash
   git checkout HEAD~1 -- src/components/generator-v2/hooks/useCostCalculation.ts
   ```

3. **Database rollback (if needed):**
   ```sql
   ALTER TABLE generations 
     DROP COLUMN IF EXISTS charged_stars,
     DROP COLUMN IF EXISTS sku,
     DROP COLUMN IF EXISTS pricing_version;
   
   ALTER TABLE credit_transactions 
     DROP COLUMN IF EXISTS sku,
     DROP COLUMN IF EXISTS pricing_version;
   ```

## Support

For issues or questions:
1. Check console logs for `[⭐ AUDIT]` entries
2. Query database for pricing discrepancies
3. Verify SKU generation with `getSkuFromRequest()` in dev tools

## Notes

- All prices are now in STARS (⭐) only - no RUB/USD/credit conversions
- SKU is the atomic unit of pricing - every generation must have a valid SKU
- `getPriceStars()` will throw an error if SKU is not found (fail hard by design)
- Motion control is per-second pricing - multiply rate by duration
- Legacy `compute-price.ts` is kept for backwards compatibility but deprecated
