/**
 * Queue Helper - Добавление задач в очередь генерации
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface QueueTaskParams {
  generationId: string;
  type: 'photo' | 'video';
  priority?: number;
  params: Record<string, any>;
}

/**
 * Добавить задачу в очередь генерации
 */
export async function addToGenerationQueue(
  supabase: SupabaseClient,
  task: QueueTaskParams
): Promise<{ success: boolean; taskId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('generation_queue')
      .insert({
        generation_id: task.generationId,
        type: task.type,
        priority: task.priority || 0,
        params: task.params,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      console.error('[Queue] Failed to add task:', error);
      return { success: false, error: error.message };
    }

    return { success: true, taskId: data.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Queue] Unexpected error:', message);
    return { success: false, error: message };
  }
}

/**
 * Проверить, есть ли задача в очереди для генерации
 */
export async function getQueueStatus(
  supabase: SupabaseClient,
  generationId: string
): Promise<{ status: string | null; position?: number }> {
  try {
    const { data, error } = await supabase
      .from('generation_queue')
      .select('id, status, created_at')
      .eq('generation_id', generationId)
      .single();

    if (error || !data) {
      return { status: null };
    }

    // Если pending, посчитать позицию в очереди
    if (data.status === 'pending') {
      const { count } = await supabase
        .from('generation_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .lt('created_at', data.created_at);

      return { status: data.status, position: (count || 0) + 1 };
    }

    return { status: data.status };
  } catch {
    return { status: null };
  }
}

