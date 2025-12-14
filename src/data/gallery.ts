export interface GalleryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  model: string;
  likes: number;
  views: number;
  author: string;
  createdAt: string;
}

export const MOCK_GALLERY: GalleryItem[] = [
  {
    id: '1',
    imageUrl: 'https://picsum.photos/seed/1/800/600',
    prompt: 'A futuristic cityscape at sunset',
    model: 'Flux Pro',
    likes: 234,
    views: 1520,
    author: 'user1',
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    imageUrl: 'https://picsum.photos/seed/2/600/800',
    prompt: 'Portrait of a cyberpunk character',
    model: 'Midjourney',
    likes: 189,
    views: 980,
    author: 'user2',
    createdAt: '2024-01-14',
  },
  {
    id: '3',
    imageUrl: 'https://picsum.photos/seed/3/800/800',
    prompt: 'Abstract art with vibrant colors',
    model: 'DALL-E 3',
    likes: 312,
    views: 2100,
    author: 'user3',
    createdAt: '2024-01-13',
  },
  {
    id: '4',
    imageUrl: 'https://picsum.photos/seed/4/700/900',
    prompt: 'Fantasy landscape with dragons',
    model: 'Stable Diffusion',
    likes: 456,
    views: 3200,
    author: 'user4',
    createdAt: '2024-01-12',
  },
  {
    id: '5',
    imageUrl: 'https://picsum.photos/seed/5/900/600',
    prompt: 'Minimalist architecture photography',
    model: 'Flux Pro',
    likes: 178,
    views: 890,
    author: 'user5',
    createdAt: '2024-01-11',
  },
  {
    id: '6',
    imageUrl: 'https://picsum.photos/seed/6/600/900',
    prompt: 'Anime style character design',
    model: 'NovelAI',
    likes: 523,
    views: 4500,
    author: 'user6',
    createdAt: '2024-01-10',
  },
];



