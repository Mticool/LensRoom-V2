'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { TabType } from '@/types/video-generator';

interface SettingsTabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  children: React.ReactNode;
}

export function SettingsTabs({ activeTab, onTabChange, children }: SettingsTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={(value) => onTabChange(value as TabType)}>
      <TabsList className="grid w-full grid-cols-4 mb-6">
        <TabsTrigger value="video">Видео</TabsTrigger>
        <TabsTrigger value="motion">Motion</TabsTrigger>
        <TabsTrigger value="edit">Edit</TabsTrigger>
        <TabsTrigger value="music">Music</TabsTrigger>
      </TabsList>

      <TabsContent value="video" className="space-y-6">
        {children}
      </TabsContent>

      <TabsContent value="motion" className="space-y-6">
        <div className="text-center py-12">
          <p className="text-[var(--muted)] text-sm">Motion Control скоро появится</p>
        </div>
      </TabsContent>

      <TabsContent value="edit" className="space-y-6">
        <div className="text-center py-12">
          <p className="text-[var(--muted)] text-sm">Редактирование скоро появится</p>
        </div>
      </TabsContent>

      <TabsContent value="music" className="space-y-6">
        <div className="text-center py-12">
          <p className="text-[var(--muted)] text-sm">Музыка скоро появится</p>
        </div>
      </TabsContent>
    </Tabs>
  );
}
