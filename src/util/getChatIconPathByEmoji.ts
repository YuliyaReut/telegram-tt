import { IconName } from "../types/icons";

export const emojiToIconMap = {
  '\uD83D\uDCE2': 'channel-filled',
  '\u2705': 'chat-badge',
  '\uD83D\uDCAC': 'chats-badge',
  '\uD83D\uDCC1': 'folder-badge',
  '\uD83D\uDC65': 'group-filled',
  '\u2B50': 'star',
  '\uD83E\uDD16': 'bots',
  '\uD83D\uDC64': 'user-filled'
};

export const chatFolderIcons = Array.from(Object.values(emojiToIconMap));

export function getEmojiByIcon(iconName: IconName) {
  return Object.keys(emojiToIconMap).find((key) => emojiToIconMap[key as keyof typeof emojiToIconMap] === iconName);
}

export function getIconPathByEmoji(emoji: keyof typeof emojiToIconMap | undefined): IconName {
  if (emoji && emojiToIconMap[emoji]) {
    return emojiToIconMap[emoji] as IconName;
  }

  return 'folder-badge';
}
