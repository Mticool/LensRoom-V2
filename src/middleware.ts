import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const userAgent = request.headers.get('user-agent') || '';
  
  // Проверяем мобильное устройство по User-Agent
  const isMobile = /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // Если мобильное и идут на /create - редиректим на /m
  if (isMobile && request.nextUrl.pathname === '/create') {
    const url = request.nextUrl.clone();
    url.pathname = '/m';
    return NextResponse.redirect(url);
  }
  
  return NextResponse.next();
}

// Применять middleware только к определённым путям
export const config = {
  matcher: '/create',
};
