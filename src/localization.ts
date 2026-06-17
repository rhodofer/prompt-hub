import * as vscode from 'vscode';

export interface TranslationBundle {
  webviewTitleNew: string;
  webviewTitleEdit: string;
  textareaLabel: string;
  textareaPlaceholder: string;
  emptyError: string;
  imagesLabel: string;
  pasteZoneHintCtrlV: string;
  pasteZoneHintDrag: string;
  removeImageTooltip: string;
  cancelButton: string;
  saveButton: string;
  defaultImageTitle: string;
  
  // Extension side notifications
  addedNotification: string;
  addedWithImagesNotification: string;
  autoAddedNotification: string;
  autoAddedImagesNotification: string;
  copyTextImageNotification: string;
  copyFirstImageNotification: string;
  copiedNotification: string;
  deleteConfirmTitle: string;
  deleteConfirmButton: string;
  deletedNotification: string;
  updatedNotification: string;
  cannotOpenImage: string;
  settingsTitle: string;
  settingsSaved: string;
  languageLabel: string;
  languageDescription: string;
  pasteDelayLabel: string;
  pasteDelayDescription: string;
  activePromptsTitle: string;
  completedPromptsTitle: string;
}

const en: TranslationBundle = {
  webviewTitleNew: '📝 New Prompt',
  webviewTitleEdit: '✏️ Edit Prompt',
  textareaLabel: 'Prompt',
  textareaPlaceholder: 'Type or paste your prompt content here…',
  emptyError: 'You must add at least some text or an image.',
  imagesLabel: 'Images (optional)',
  pasteZoneHintCtrlV: '📋 Press Ctrl+V to paste images from clipboard',
  pasteZoneHintDrag: 'or drag and drop PNG / JPG files here',
  removeImageTooltip: 'Remove Image',
  cancelButton: 'Cancel',
  saveButton: '💾 Save',
  defaultImageTitle: 'Image Prompt',

  addedNotification: '✅ "{title}" added.',
  addedWithImagesNotification: '✅ "{title}" added with {count} images 🖼️.',
  autoAddedNotification: '🚀 {countStr} and text auto-added to Chat box!',
  autoAddedImagesNotification: '🚀 {countStr} auto-added to Chat box!',
  copyTextImageNotification: '🚀 Text added to Chat box. Press Win+V to paste the image.',
  copyFirstImageNotification: '🚀 First image copied to clipboard. Press Ctrl+V or Win+V to paste it.',
  copiedNotification: '🚀 "{title}" added to Chat box!',
  deleteConfirmTitle: 'Delete "{title}"?',
  deleteConfirmButton: 'Delete',
  deletedNotification: '🗑️ Prompt deleted.',
  updatedNotification: '✏️ Prompt updated.',
  cannotOpenImage: 'Cannot open image {name}: {err}',
  settingsTitle: '⚙️ Prompt Hub Settings',
  settingsSaved: '⚙️ Settings saved successfully.',
  languageLabel: 'Preferred Language',
  languageDescription: 'Select the language for the Prompt Hub UI.',
  pasteDelayLabel: 'Paste Delay (ms)',
  pasteDelayDescription: 'The delay in milliseconds before simulating the paste keypress after focusing the chat panel.',
  activePromptsTitle: 'Active Prompts',
  completedPromptsTitle: 'Previously Completed',
};

const tr: TranslationBundle = {
  webviewTitleNew: '📝 Yeni Prompt',
  webviewTitleEdit: '✏️ Promptu Düzenle',
  textareaLabel: 'Prompt',
  textareaPlaceholder: 'Prompt metnini buraya yazın veya yapıştırın…',
  emptyError: 'En az bir prompt metni veya görsel eklemelisiniz.',
  imagesLabel: 'Resimler (isteğe bağlı)',
  pasteZoneHintCtrlV: '📋 Ctrl+V ile panodaki resimleri yapıştırın',
  pasteZoneHintDrag: 'ya da PNG / JPG dosyalarını buraya sürükleyin',
  removeImageTooltip: 'Resmi Kaldır',
  cancelButton: 'İptal',
  saveButton: '💾 Kaydet',
  defaultImageTitle: 'Görsel Prompt',

  addedNotification: '✅ "{title}" eklendi.',
  addedWithImagesNotification: '✅ "{title}" eklendi ({count} görsel 🖼️).',
  autoAddedNotification: '🚀 {countStr} ve metin Chat kutusuna otomatik eklendi!',
  autoAddedImagesNotification: '🚀 {countStr} Chat kutusuna otomatik eklendi!',
  copyTextImageNotification: '🚀 Metin Chat kutusuna eklendi, ilk resmi yapıştırmak için Win+V yapabilirsiniz.',
  copyFirstImageNotification: '🚀 İlk resim panoya kopyalandı, yapıştırmak için Win+V veya Ctrl+V yapabilirsiniz.',
  copiedNotification: '🚀 "{title}" Chat kutusuna eklendi!',
  deleteConfirmTitle: '"{title}" silinsin mi?',
  deleteConfirmButton: 'Sil',
  deletedNotification: '🗑️ Prompt silindi.',
  updatedNotification: '✏️ Prompt güncellendi.',
  cannotOpenImage: 'Görsel açılamadı {name}: {err}',
  settingsTitle: '⚙️ Prompt Hub Ayarları',
  settingsSaved: '⚙️ Ayarlar başarıyla kaydedildi.',
  languageLabel: 'Tercih Edilen Dil',
  languageDescription: 'Prompt Hub arayüzü için kullanılacak dili seçin.',
  pasteDelayLabel: 'Yapıştırma Gecikmesi (ms)',
  pasteDelayDescription: 'Sohbet paneli odaklandıktan sonra yapıştırma tuş simülasyonu yapılmadan önce beklenecek milisaniye cinsinden gecikme süresi.',
  activePromptsTitle: 'Aktif Promptlar',
  completedPromptsTitle: 'Daha Önce Tamamlananlar',
};

export function getTranslations(): TranslationBundle {
  const config = vscode.workspace.getConfiguration('promptHub');
  const langSetting = config.get<string>('language', 'auto');

  if (langSetting === 'tr') {
    return tr;
  } else if (langSetting === 'en') {
    return en;
  }

  // "auto" detection
  const envLang = vscode.env.language;
  if (envLang && envLang.startsWith('tr')) {
    return tr;
  }
  return en;
}
