'use client';

import { Plus, X, GripVertical, Film } from 'lucide-react';
import { useState } from 'react';

interface Scene {
  id: string;
  prompt: string;
  duration: number;
}

interface StoryboardProps {
  onScenesChange: (scenes: Scene[]) => void;
}

export function Storyboard({ onScenesChange }: StoryboardProps) {
  const [scenes, setScenes] = useState<Scene[]>([
    { id: '1', prompt: '', duration: 3 },
  ]);

  const addScene = () => {
    const newScene: Scene = {
      id: Date.now().toString(),
      prompt: '',
      duration: 3,
    };
    const updated = [...scenes, newScene];
    setScenes(updated);
    onScenesChange(updated);
  };

  const removeScene = (id: string) => {
    const updated = scenes.filter(s => s.id !== id);
    setScenes(updated);
    onScenesChange(updated);
  };

  const updateScene = (id: string, field: keyof Scene, value: string | number) => {
    const updated = scenes.map(s => 
      s.id === id ? { ...s, [field]: value } : s
    );
    setScenes(updated);
    onScenesChange(updated);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <label className="text-sm font-medium text-white/70 flex items-center gap-2">
            <Film className="w-4 h-4 text-[#c8ff00]" />
            Раскадровка
          </label>
          <p className="text-xs text-white/40 mt-1">
            Создайте последовательность сцен
          </p>
        </div>
        <button
          type="button"
          onClick={addScene}
          disabled={scenes.length >= 10}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#c8ff00]/10 text-[#c8ff00] text-sm font-medium hover:bg-[#c8ff00]/20 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      <div className="space-y-3">
        {scenes.map((scene, index) => (
          <div key={scene.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
            <div className="flex items-start gap-3">
              <div className="flex items-center gap-2 mt-3">
                <GripVertical className="w-4 h-4 text-white/30 cursor-move" />
                <span className="text-sm font-medium text-white/40 w-4">
                  {index + 1}
                </span>
              </div>

              <div className="flex-1 space-y-3">
                <div>
                  <label className="text-xs text-white/40 mb-1 block">
                    Описание сцены
                  </label>
                  <textarea
                    value={scene.prompt}
                    onChange={(e) => updateScene(scene.id, 'prompt', e.target.value)}
                    placeholder="Опишите что происходит..."
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg 
                             text-sm text-white placeholder:text-white/30
                             resize-none focus:outline-none focus:border-[#c8ff00]/50"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="text-xs text-white/40 mb-1 flex items-center justify-between">
                    <span>Длительность</span>
                    <span className="text-white font-medium">{scene.duration}с</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={scene.duration}
                    onChange={(e) => updateScene(scene.id, 'duration', Number(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer 
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 
                             [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full 
                             [&::-webkit-slider-thumb]:bg-[#c8ff00]"
                  />
                </div>
              </div>

              {scenes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeScene(scene.id)}
                  className="p-2 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-xs text-white/40 bg-white/5 px-3 py-2 rounded-lg">
        <span>Всего сцен: {scenes.length}</span>
        <span>
          Общая длительность: {scenes.reduce((sum, s) => sum + s.duration, 0)}с
        </span>
      </div>
    </div>
  );
}

