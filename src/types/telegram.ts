// Telegram Login Widget payload
export interface TelegramLoginPayload {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

// User roles
export type UserRole = 'user' | 'manager' | 'admin';

// Profile from database
export interface Profile {
  id: string;
  telegram_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  photo_url: string | null;
  is_admin: boolean;
  role: UserRole;
  created_at: string;
  last_login_at: string;
}

// Telegram bot link
export interface TelegramBotLink {
  telegram_id: number;
  can_notify: boolean;
  chat_id: number | null;
  linked_at: string;
  updated_at: string;
}

// Waitlist subscription
export interface WaitlistSubscription {
  id: string;
  profile_id: string;
  type: WaitlistType;
  source: string | null;
  status: WaitlistStatus;
  created_at: string;
  notified_at: string | null;
}

// Waitlist types
export type WaitlistType = 
  | 'academy' 
  | 'feature_video_ads' 
  | 'feature_lifestyle' 
  | 'feature_ab_covers'
  | 'feature_infographics';

export type WaitlistStatus = 'active' | 'notified' | 'cancelled';

// Session stored in JWT cookie
export interface TelegramSession {
  profileId: string;
  telegramId: number;
  username: string | null;
  firstName: string | null;
  photoUrl: string | null;
  isAdmin: boolean;
  role: UserRole;
}

// Telegram webhook update types
export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
}

export interface TelegramMessage {
  message_id: number;
  from: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
}


