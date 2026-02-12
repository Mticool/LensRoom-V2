import { validateCapabilityDataUrl } from '../file-validation';
import { getModelCapability } from '../capabilities';

describe('Video Data URL Validation', () => {
  it('accepts valid motion-control image and video formats', () => {
    const capability = getModelCapability('kling-motion-control');
    expect(capability).toBeDefined();

    const imageErr = validateCapabilityDataUrl(
      'data:image/png;base64,ZmFrZQ==',
      'inputImage',
      capability
    );
    const videoErr = validateCapabilityDataUrl(
      'data:video/mp4;base64,ZmFrZQ==',
      'referenceVideo',
      capability
    );

    expect(imageErr).toBeNull();
    expect(videoErr).toBeNull();
  });

  it('rejects unsupported image format for motion-control character image', () => {
    const capability = getModelCapability('kling-motion-control');
    expect(capability).toBeDefined();

    const err = validateCapabilityDataUrl(
      'data:image/gif;base64,ZmFrZQ==',
      'inputImage',
      capability
    );

    expect(err).toContain("Invalid inputImage format 'gif'");
  });

  it('rejects unsupported video format for motion-control reference video', () => {
    const capability = getModelCapability('kling-motion-control');
    expect(capability).toBeDefined();

    const err = validateCapabilityDataUrl(
      'data:video/x-msvideo;base64,ZmFrZQ==',
      'referenceVideo',
      capability
    );

    expect(err).toContain("Invalid referenceVideo format 'avi'");
  });

  it('rejects file exceeding max size limit', () => {
    const capability = getModelCapability('kling-motion-control');
    expect(capability).toBeDefined();

    // ~11MB in base64 characters, above 10MB image cap.
    const oversized = 'A'.repeat(Math.ceil((11 * 1024 * 1024 * 4) / 3));
    const err = validateCapabilityDataUrl(
      `data:image/png;base64,${oversized}`,
      'inputImage',
      capability
    );

    expect(err).toContain('File too large for inputImage');
    expect(err).toContain('Max: 10 MB');
  });
});
