import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, respondAuthError } from "@/lib/auth/requireRole";

// GET - Fetch all categories
export async function GET(request: Request) {
  try {
    await requireRole("manager");

    const supabase = getSupabaseAdmin();
    
    // Get unique categories from effects_gallery
    const { data, error } = await supabase
      .from('effects_gallery')
      .select('category')
      .not('category', 'is', null)
      .not('category', 'eq', '');

    if (error) {
      console.error('Error fetching categories:', error);
      
      // Если таблица не существует
      if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
        return NextResponse.json({ 
          error: 'Таблица effects_gallery не найдена. Выполните миграцию базы данных.',
          categories: []
        }, { status: 500 });
      }
      
      return NextResponse.json({ error: error.message, categories: [] }, { status: 500 });
    }

    // Extract unique categories
    const uniqueCategories = Array.from(
      new Set((data || []).map((row: any) => row.category).filter(Boolean))
    ).sort();

    return NextResponse.json({ categories: uniqueCategories });
  } catch (error: any) {
    console.error('Categories API error:', error);
    
    // Если таблица не существует
    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      return NextResponse.json({ 
        error: 'Таблица effects_gallery не найдена. Выполните миграцию базы данных.',
        categories: []
      }, { status: 500 });
    }
    
    return respondAuthError(error);
  }
}

// POST - Create new category (just validates, actual saving happens in gallery)
export async function POST(request: Request) {
  try {
    await requireRole("manager");

    const body = await request.json();
    const { name } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    // Category will be created when first item is saved with it
    return NextResponse.json({ success: true, category: name.trim() });
  } catch (error) {
    console.error('Create category error:', error);
    return respondAuthError(error);
  }
}
