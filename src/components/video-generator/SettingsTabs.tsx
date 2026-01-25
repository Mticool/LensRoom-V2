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
}

export function SettingsTabs({ 
  activeTab, 
  onTabChange, 
  children,
  motionContent,
  editContent,
  musicContent,
}: SettingsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabType)}>
      <TabsList className="grid w-full grid-cols-4 mb-3">
        <TabsTrigger value="video">Видео</TabsTrigger>
        <TabsTrigger value="motion">Motion</TabsTrigger>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="music">Music</TabsTrigger>
      </TabsList>

      <TabsContent value="video" className="space-y-3">
        {children}
      </TabsContent>

      <TabsContent value="motion" className="space-y-3">
        {motionContent || (
          <div className="text-center py-4">
            <p className="text-[var(--muted)] text-sm">Motion Control скоро появится</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="edit" className="space-y-3">
        {editContent || (
          <div className="text-center py-4">
            <p className="text-[var(--muted)] text-sm">Редактирование скоро появится</p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="music" className="space-y-3">
        {musicContent || (
          <div className="text-center py-4">
            <p className="text-[var(--muted)] text-sm">Музыка скоро появится</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
