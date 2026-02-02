/**
 * Validation tests for video model capabilities
 * Ensures all models have valid and consistent configurations
 */

import { VIDEO_MODELS, getModelCapability, getDefaultsForModel } from '../capabilities';
import type { ModelCapability } from '../schema';

describe('Video Model Capabilities', () => {
  describe('Basic validation', () => {
    it('should have at least one model', () => {
      expect(VIDEO_MODELS.length).toBeGreaterThan(0);
    });

    it('should have unique model IDs', () => {
      const ids = VIDEO_MODELS.map(m => m.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid provider for each model', () => {
      const validProviders = ['kie', 'laozhang'];
      VIDEO_MODELS.forEach(model => {
        expect(validProviders).toContain(model.provider);
      });
    });
  });

  describe('Mode validation', () => {
    it('should have at least one supported mode', () => {
      VIDEO_MODELS.forEach(model => {
        expect(model.supportedModes.length).toBeGreaterThan(0);
      });
    });

    it('should have valid mode values', () => {
      const validModes = ['t2v', 'i2v', 'v2v', 'start_end', 'extend', 'motion_control'];
      VIDEO_MODELS.forEach(model => {
        model.supportedModes.forEach(mode => {
          expect(validModes).toContain(mode);
        });
      });
    });

    it('should not have start_end in supportedModes if supportsStartEndFrames is false', () => {
      VIDEO_MODELS.forEach(model => {
        if (model.supportsStartEndFrames === false) {
          expect(model.supportedModes).not.toContain('start_end');
        }
      });
    });
  });

  describe('Duration validation', () => {
    it('should have at least one duration option or fixedDuration', () => {
      VIDEO_MODELS.forEach(model => {
        const hasDurations = model.supportedDurationsSec && model.supportedDurationsSec.length > 0;
        const hasFixedDuration = typeof model.fixedDuration === 'number';
        const hasDurationRange = model.durationRange &&
          typeof model.durationRange.min === 'number' &&
          typeof model.durationRange.max === 'number';

        expect(hasDurations || hasFixedDuration || hasDurationRange).toBe(true);
      });
    });

    it('should have valid duration values', () => {
      VIDEO_MODELS.forEach(model => {
        if (model.supportedDurationsSec) {
          model.supportedDurationsSec.forEach(duration => {
            expect(duration).toBeGreaterThan(0);
            expect(duration).toBeLessThanOrEqual(60);
          });
        }
      });
    });

    it('should not have fixedDuration if multiple durations are supported', () => {
      VIDEO_MODELS.forEach(model => {
        if (model.supportedDurationsSec && model.supportedDurationsSec.length > 1) {
          expect(model.fixedDuration).toBeUndefined();
        }
      });
    });
  });

  describe('Aspect ratio validation', () => {
    it('should have at least one aspect ratio', () => {
      VIDEO_MODELS.forEach(model => {
        expect(model.supportedAspectRatios.length).toBeGreaterThan(0);
      });
    });

    it('should have valid aspect ratio formats', () => {
      const validFormats = /^(\d+:\d+|auto|portrait|landscape)$/;
      VIDEO_MODELS.forEach(model => {
        model.supportedAspectRatios.forEach(ratio => {
          expect(ratio).toMatch(validFormats);
        });
      });
    });
  });

  describe('Quality validation', () => {
    it('should have valid quality values if specified', () => {
      const validQualities = ['480p', '720p', '1080p', '4K', 'standard', 'pro', 'master'];
      VIDEO_MODELS.forEach(model => {
        if (model.supportedQualities) {
          model.supportedQualities.forEach(quality => {
            expect(validQualities).toContain(quality);
          });
        }
      });
    });
  });

  describe('Provider-specific validation', () => {
    describe('KIE provider models', () => {
      const kieModels = VIDEO_MODELS.filter(m => m.provider === 'kie');

      it('should have valid apiId format', () => {
        kieModels.forEach(model => {
          expect(model.apiId).toBeTruthy();
          expect(typeof model.apiId).toBe('string');
        });
      });
    });

    describe('LaoZhang provider models', () => {
      const laozhangModels = VIDEO_MODELS.filter(m => m.provider === 'laozhang');

      it('should have exactly 2 models (Veo 3.1 Fast and Sora 2)', () => {
        expect(laozhangModels.length).toBe(2);
      });

      it('should be Veo 3.1 Fast and Sora 2', () => {
        const modelIds = laozhangModels.map(m => m.id).sort();
        expect(modelIds).toEqual(['sora-2', 'veo-3.1-fast']);
      });

      it('should have valid apiId', () => {
        laozhangModels.forEach(model => {
          expect(model.apiId).toBeTruthy();
          expect(typeof model.apiId).toBe('string');
        });
      });
    });
  });

  describe('Feature flags consistency', () => {
    it('should have supportsReferenceImages true if i2v mode is supported', () => {
      VIDEO_MODELS.forEach(model => {
        if (model.supportedModes.includes('i2v')) {
          // Allow undefined or true, but not explicitly false for i2v models
          if (model.supportsReferenceImages !== undefined) {
            // Grok может быть исключением - проверим отдельно
            if (model.id !== 'grok-video') {
              expect(model.supportsReferenceImages).toBe(true);
            }
          }
        }
      });
    });

    it('should have supportsReferenceVideo true if v2v mode is supported', () => {
      VIDEO_MODELS.forEach(model => {
        if (model.supportedModes.includes('v2v')) {
          expect(model.supportsReferenceVideo).toBe(true);
        }
      });
    });
  });

  describe('Helper functions', () => {
    it('getModelCapability should return correct model', () => {
      const model = getModelCapability('veo-3.1-fast');
      expect(model).toBeDefined();
      expect(model?.id).toBe('veo-3.1-fast');
    });

    it('getModelCapability should return undefined for invalid ID', () => {
      const model = getModelCapability('invalid-model-id');
      expect(model).toBeUndefined();
    });

    it('getDefaultsForModel should return valid defaults', () => {
      VIDEO_MODELS.forEach(model => {
        const defaults = getDefaultsForModel(model.id);
        expect(defaults).toBeDefined();
        expect(defaults?.mode).toBeTruthy();
        expect(defaults?.aspectRatio).toBeTruthy();
        expect(defaults?.durationSec).toBeGreaterThan(0);
      });
    });
  });

  describe('Known model configurations (regression tests)', () => {
    it('Veo 3.1 Fast should support all expected features', () => {
      const veo = getModelCapability('veo-3.1-fast');
      expect(veo).toBeDefined();
      expect(veo?.provider).toBe('laozhang');
      expect(veo?.supportedModes).toContain('t2v');
      expect(veo?.supportedModes).toContain('i2v');
      expect(veo?.supportedModes).toContain('start_end');
      expect(veo?.supportedModes).toContain('extend');
      expect(veo?.supportedDurationsSec).toEqual([4, 6, 8]);
      expect(veo?.supportsReferenceImages).toBe(true);
      expect(veo?.supportsStartEndFrames).toBe(true);
    });

    it('Kling 2.6 should NOT support start_end frames', () => {
      const kling = getModelCapability('kling-2.6');
      expect(kling).toBeDefined();
      expect(kling?.supportsStartEndFrames).toBe(false);
      expect(kling?.supportedModes).not.toContain('start_end');
      expect(kling?.supportsSound).toBe(true);
    });

    it('Grok Video should have correct styles', () => {
      const grok = getModelCapability('grok-video');
      expect(grok).toBeDefined();
      expect(grok?.styleOptions).toEqual(['normal', 'fun', 'spicy']);
      expect(grok?.supportedDurationsSec).toEqual([6, 10]);
      expect(grok?.supportsSound).toBe(true);
    });

    it('Sora 2 should support correct durations', () => {
      const sora = getModelCapability('sora-2');
      expect(sora).toBeDefined();
      expect(sora?.provider).toBe('laozhang');
      expect(sora?.supportedDurationsSec).toEqual([10, 15]);
      expect(sora?.supportsSound).toBe(true);
      expect(sora?.supportsReferenceImages).toBe(true);
    });

    it('WAN 2.6 should support v2v and camera motion', () => {
      const wan = getModelCapability('wan-2.6');
      expect(wan).toBeDefined();
      expect(wan?.supportedModes).toContain('v2v');
      expect(wan?.supportsReferenceVideo).toBe(true);
      expect(wan?.cameraMotionOptions).toBeDefined();
      expect(wan?.cameraMotionOptions?.length).toBeGreaterThan(0);
    });
  });
});
