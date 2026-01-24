'use client';

import { FileText, Image, Film, Video, Scissors } from 'lucide-react';
import type { VideoMode } from '@/types/video-generator';

interface VideoSourceSelectorProps {
  value: VideoMode;
  onChange: (mode: VideoMode) => void;
  prompt: string;
  onPromptChange: (prompt: string) => void;
  onFileUpload?: (file: File, field: string) => void;

  // Basic modes
  referenceImage?: string | null;
  referenceVideo?: string | null;

  // Start/End Frame mode
  startFrame?: string | null;
  endFrame?: string | null;

  // V2V mode
  v2vInputVideo?: string | null;

  // Video Edit mode
  editVideo?: string | null;
  editRefImage?: string | null;

  availableModes?: VideoMode[]; // Filter modes based on model capabilities
}

export function VideoSourceSelector({
  value,
  onChange,
  prompt,
  onPromptChange,
  onFileUpload,
  referenceImage,
  referenceVideo,
  startFrame,
  endFrame,
  v2vInputVideo,
  editVideo,
  editRefImage,
  availableModes = ['text', 'image', 'reference'], // Default: basic modes
}: VideoSourceSelectorProps) {
  // Motion Control moved to separate tab - not shown here
  const allModes: { value: VideoMode; label: string; icon: typeof FileText; description?: string }[] = [
    { value: 'text', label: 'Текст', icon: FileText, description: 'Text-to-Video' },
    { value: 'image', label: 'Картинка', icon: Image, description: 'Image-to-Video' },
    { value: 'reference', label: 'Референс', icon: Film, description: 'Reference Video / Start+End Frames' },
    { value: 'v2v', label: 'Видео→Видео', icon: Video, description: 'Video-to-Video' },
    { value: 'edit', label: 'Редактор', icon: Scissors, description: 'Video Editing (Kling O1)' },
  ];

  // Filter modes based on model capabilities
  const modes = allModes.filter((mode) => availableModes.includes(mode.value));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file && onFileUpload) {
      onFileUpload(file, field);
    }
  };

  // File upload helper component
  const FileUploadField = ({
    label,
    accept,
    field,
    currentFile,
    fileType,
  }: {
    label: string;
    accept: string;
    field: string;
    currentFile?: string | null;
    fileType: 'image' | 'video';
  }) => (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <label className="block cursor-pointer">
        <div
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
            currentFile
              ? 'border-[var(--accent-primary)] bg-[var(--accent-primary)]/5'
              : 'border-[var(--border)] hover:border-[var(--border-hover)] bg-[var(--surface2)]'
          }`}
        >
          {currentFile ? (
            <div className="space-y-2">
              {fileType === 'image' ? (
                <img src={currentFile} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
              ) : (
                <Film className="w-12 h-12 mx-auto text-[var(--accent-primary)]" />
              )}
              <p className="text-xs text-[var(--muted)]">
                {fileType === 'image' ? 'Изображение загружено' : 'Видео загружено'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[var(--surface3)] flex items-center justify-center">
                {fileType === 'image' ? (
                  <Image className="w-6 h-6 text-[var(--muted)]" />
                ) : (
                  <Film className="w-6 h-6 text-[var(--muted)]" />
                )}
              </div>
              <p className="text-sm text-[var(--muted)]">Перетащи файл или нажми для загрузки</p>
              <p className="text-xs text-[var(--muted)]">
                {fileType === 'image' ? 'PNG, JPG, WEBP' : 'MP4, MOV, WEBM'}
              </p>
            </div>
          )}
        </div>
        <input type="file" accept={accept} onChange={(e) => handleFileChange(e, field)} className="hidden" />
      </label>
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {modes.map((mode) => {
          const Icon = mode.icon;
          const isActive = value === mode.value;

          return (
            <button
              key={mode.value}
              onClick={() => onChange(mode.value)}
              className={`flex-1 min-w-[100px] px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                isActive
                  ? 'bg-[var(--accent-primary)] text-black border-[var(--accent-primary)]'
                  : 'bg-[var(--surface2)] text-[var(--text)] border-[var(--border)] hover:border-[var(--border-hover)]'
              }`}
              title={mode.description}
            >
              <Icon className="w-4 h-4 mx-auto mb-1" />
              <span className="block">{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Prompt Textarea (always visible) */}
      <div>
        <label htmlFor="prompt" className="block text-sm font-medium mb-2">
          Описание сцены
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="Опиши сцену, которую нужно сгенерировать..."
          className="w-full px-4 py-3 bg-[var(--surface2)] border border-[var(--border)] rounded-lg text-[var(--text)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]/50 focus:border-[var(--accent-primary)] resize-none min-h-[100px]"
        />
      </div>

      {/* File Uploads (conditional based on mode) */}
      {value === 'image' && (
        <FileUploadField
          label="Загрузить изображение"
          accept="image/*"
          field="referenceImage"
          currentFile={referenceImage}
          fileType="image"
        />
      )}

      {value === 'reference' && (
        <>
          <FileUploadField
            label="Референс видео (или Start Frame)"
            accept="video/*,image/*"
            field="referenceVideo"
            currentFile={referenceVideo || startFrame}
            fileType={referenceVideo ? 'video' : 'image'}
          />
          <div className="text-xs text-[var(--muted)] -mt-2">
            💡 Загрузите видео для референса, или 2 изображения для Start+End режима
          </div>
          {startFrame && (
            <FileUploadField
              label="End Frame (опционально)"
              accept="image/*"
              field="endFrame"
              currentFile={endFrame}
              fileType="image"
            />
          )}
        </>
      )}

      {value === 'v2v' && (
        <FileUploadField
          label="Исходное видео"
          accept="video/*"
          field="v2vInputVideo"
          currentFile={v2vInputVideo}
          fileType="video"
        />
      )}

      {value === 'edit' && (
        <>
          <FileUploadField
            label="Видео для редактирования"
            accept="video/*"
            field="editVideo"
            currentFile={editVideo}
            fileType="video"
          />
          <FileUploadField
            label="Референс изображение (опционально)"
            accept="image/*"
            field="editRefImage"
            currentFile={editRefImage}
            fileType="image"
          />
        </>
      )}
    </div>
  );
}
