/**
 * Telegram User State Exports
 */

export {
  // Types
  type FlowType,
  type ConversationState,
  type TelegramUserSettings,

  // State management
  getUserState,
  updateUserState,

  // Flow management
  startFlow,
  updateFlow,
  clearFlow,
  hasActiveFlow,
  getCurrentFlow,

  // User account
  linkUserAccount,
  updatePreferences,
  updateNotifications,

  // Favorites
  addToFavorites,
  removeFromFavorites,
  isInFavorites,
  getFavorites,
  countFavorites,
} from './user-state';
