import { create } from 'zustand';

interface CreateState {
  selectedModel: string;
  setSelectedModel: (model: string) => void;
}

export const useCreateStore = create<CreateState>((set) => ({
  selectedModel: 'nano-banana',
  setSelectedModel: (model) => set({ selectedModel: model }),
}));
