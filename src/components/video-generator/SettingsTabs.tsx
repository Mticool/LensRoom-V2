'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { TabType } from '@/types/video-generator';

interface SettingsTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  children: React.ReactNode;
  motionContent?: React.ReactNode;
  editContent?: React.ReactNode;
  musicContent?: React.ReactNode;
  /** Hide Edit/Music tabs (for desktop layout) */
  compactMode?: boolean;
}

export function SettingsTabs({
  activeTab,
  onTabChange,
  children,
  motionContent,
  editContent,
  musicContent,
  compactMode = false,
}: SettingsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabType)}>
      {/* Desktop: 2 tabs (Видео, Motion), Mobile: 4 tabs */}
      <TabsList className={`grid w-full mb-2 ${compactMode ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <TabsTrigger value="video" className="text-xs">Видео</TabsTrigger>
        <TabsTrigger value="motion" className="text-xs">Motion</TabsTrigger>
        {!compactMode && (
          <>
            <TabsTrigger value="edit" className="text-xs">Edit</TabsTrigger>
            <TabsTrigger value="music" className="text-xs">Music</TabsTrigger>
          </>
        )}
      </TabsList>

      <TabsContent value="video" className="space-y-2">
        {children}
      </TabsContent>

      <TabsContent value="motion" className="space-y-2">
        {motionContent || (
          <div className="text-center py-3">
            <p className="text-[var(--muted)] text-xs">Motion Control скоро появится</p>
          </div>
        )}
      </TabsContent>

      {!compactMode && (
        <>
          <TabsContent value="edit" className="space-y-2">
            {editContent || (
              <div className="text-center py-3">
                <p className="text-[var(--muted)] text-xs">Редактирование скоро появится</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="music" className="space-y-2">
            {musicContent || (
              <div className="text-center py-3">
                <p className="text-[var(--muted)] text-xs">Музыка скоро появится</p>
              </div>
            )}
          </TabsContent>
        </>
      )}
    </Tabs>
  );
}
