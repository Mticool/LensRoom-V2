/**
 * Telegram Bot Menus Exports
 */

// Main menu
export {
  showMainMenu,
  showHelp,
  showMiniApp,
} from './main-menu';

// Photo generation
export {
  showPhotoModels,
  showPhotoConfig,
  updatePhotoQuality,
  updatePhotoAspectRatio,
  switchToI2IMode,
  switchToT2IMode,
  // Settings menus
  showQualitySettings,
  showAspectRatioSettings,
  showAllSettings,
  saveAsDefaults,
  backToPhotoHome,
  // Callback handlers
  handlePhotoSettingsCallback,
  handlePhotoBackCallback,
  handlePhotoSaveCallback,
  // Formatters
  formatQuality,
  formatAspectRatio,
} from './photo-menu';

// Video generation
export {
  showVideoModels,
  showVideoConfig,
  updateVideoDuration,
  updateVideoResolution,
  updateVideoAspectRatio,
  toggleVideoAudio,
  switchToI2VMode,
  switchToT2VMode,
} from './video-menu';

// Balance and payments
export {
  showBalance,
  showPaymentOptions,
  handlePaymentSelection,
  showTransactionHistory,
} from './balance-menu';

// Audio/TTS
export {
  showAudioMenu,
  showTTSMenu,
  showVoiceCloning,
  showMusicMenu,
  showUserVoices,
} from './audio-menu';
