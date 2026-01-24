import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ImageGalleryMasonry } from '../ImageGalleryMasonry';
import type { GenerationResult } from '../GeneratorV2';

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock OptimizedImage component
vi.mock('@/components/ui/OptimizedMedia', () => ({
  OptimizedImage: ({ src, alt }: { src: string; alt: string }) => (
    <img src={src} alt={alt} data-testid="optimized-image" />
  ),
}));

const mockImages: GenerationResult[] = [
  {
    id: 'test-1',
    url: 'https://example.com/image1.jpg',
    prompt: 'Test prompt 1',
    mode: 'image',
    settings: { model: 'nano-banana-pro', size: '1:1' },
    timestamp: Date.now(),
    status: 'success',
  },
  {
    id: 'test-2',
    url: 'https://example.com/image2.jpg',
    prompt: 'Test prompt 2',
    mode: 'image',
    settings: { model: 'nano-banana-pro', size: '16:9' },
    timestamp: Date.now(),
    status: 'success',
  },
];

describe('ImageGalleryMasonry', () => {
  it('renders empty state when no images provided', () => {
    render(
      <ImageGalleryMasonry
        images={[]}
        isGenerating={false}
      />
    );
    
    expect(screen.getByText('Начните создавать')).toBeInTheDocument();
    expect(screen.getByText(/Введите описание изображения/)).toBeInTheDocument();
  });

  it('renders custom empty state messages', () => {
    render(
      <ImageGalleryMasonry
        images={[]}
        isGenerating={false}
        emptyTitle="Custom Title"
        emptyDescription="Custom Description"
      />
    );
    
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();
  });

  it('renders images when provided', () => {
    render(
      <ImageGalleryMasonry
        images={mockImages}
        isGenerating={false}
      />
    );
    
    const images = screen.getAllByTestId('optimized-image');
    expect(images).toHaveLength(2);
  });

  it('shows loading skeletons when generating', () => {
    render(
      <ImageGalleryMasonry
        images={mockImages}
        isGenerating={true}
      />
    );
    
    // Should show skeleton loaders
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('shows "Load more" button when hasMore is true', () => {
    render(
      <ImageGalleryMasonry
        images={mockImages}
        isGenerating={false}
        hasMore={true}
        onLoadMore={() => {}}
      />
    );
    
    expect(screen.getByText('Загрузить ещё')).toBeInTheDocument();
  });

  it('hides "Load more" button when hasMore is false', () => {
    render(
      <ImageGalleryMasonry
        images={mockImages}
        isGenerating={false}
        hasMore={false}
        onLoadMore={() => {}}
      />
    );
    
    expect(screen.queryByText('Загрузить ещё')).not.toBeInTheDocument();
  });

  it('calls onLoadMore when button is clicked', () => {
    const mockLoadMore = vi.fn();
    
    render(
      <ImageGalleryMasonry
        images={mockImages}
        isGenerating={false}
        hasMore={true}
        onLoadMore={mockLoadMore}
      />
    );
    
    const loadMoreButton = screen.getByText('Загрузить ещё');
    fireEvent.click(loadMoreButton);
    
    expect(mockLoadMore).toHaveBeenCalledTimes(1);
  });

  it('shows loading state when loading more', () => {
    render(
      <ImageGalleryMasonry
        images={mockImages}
        isGenerating={false}
        hasMore={true}
        onLoadMore={() => {}}
        isLoadingMore={true}
      />
    );
    
    expect(screen.getByText('Загрузка...')).toBeInTheDocument();
  });

  it('disables load more button when loading', () => {
    const mockLoadMore = vi.fn();
    
    render(
      <ImageGalleryMasonry
        images={mockImages}
        isGenerating={false}
        hasMore={true}
        onLoadMore={mockLoadMore}
        isLoadingMore={true}
      />
    );
    
    const loadMoreButton = screen.getByText('Загрузка...').closest('button');
    expect(loadMoreButton).toBeDisabled();
  });

  it('renders pending images with skeleton', () => {
    const pendingImages: GenerationResult[] = [
      {
        id: 'pending-1',
        url: '',
        prompt: 'Pending prompt',
        mode: 'image',
        settings: { model: 'nano-banana-pro', size: '1:1' },
        timestamp: Date.now(),
        status: 'pending',
      },
    ];
    
    render(
      <ImageGalleryMasonry
        images={pendingImages}
        isGenerating={false}
      />
    );
    
    // Pending images should show a loader
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('renders demo badge for demo images', () => {
    const demoImages: GenerationResult[] = [
      {
        id: 'demo-1',
        url: 'https://example.com/demo.jpg',
        prompt: 'Demo image',
        mode: 'image',
        settings: { model: 'nano-banana-pro', size: '1:1' },
        timestamp: Date.now(),
        status: 'success',
      },
    ];
    
    render(
      <ImageGalleryMasonry
        images={demoImages}
        isGenerating={false}
      />
    );
    
    expect(screen.getByText('Пример')).toBeInTheDocument();
  });
});
