import { ApiFormattedText, ApiMessageEntity, ApiMessageEntityTypes } from "../../../api/types";
import { MessageNode, NodeFormat } from "../../middle/composer/hooks/useTextEditorState";

export function convertApiFormattedTextToAST(apiText: ApiFormattedText): MessageNode[] {
  const { text, entities } = apiText;
  const result: MessageNode[] = [];
  const emojiRegex = /\p{Extended_Pictographic}/u;

  const arr = Array.from(text);

  for (let i = 0; i < arr.length; i++) {
    const char = arr[i];
    const isEmoji = emojiRegex.test(char);
    let baseType: NodeFormat = isEmoji ? "emoji" : "text";
    let node: MessageNode = { type: baseType, content: char };

    if (entities) {
      const activeEntities = entities.filter(e => e.offset <= i && i < e.offset + e.length);
      activeEntities.sort((a, b) => a.offset - b.offset);
      for (let j = activeEntities.length - 1; j >= 0; j--) {
        const entity = activeEntities[j];
        const format = convertEntityTypeToNodeFormat(entity.type);
        if (format !== "text") {
          const attributes: Record<string, any> = {};
          if (entity.type === ApiMessageEntityTypes.TextUrl && (entity as any).url) {
            attributes.href = (entity as any).url;
          } else if (entity.type === ApiMessageEntityTypes.CustomEmoji && (entity as any).documentId) {
            attributes.id = (entity as any).documentId;
          }
          node = { type: format, children: [node], attributes };
        }
      }
    }
    result.push(node);
  }
  return result;
}

function convertEntityTypeToNodeFormat(entityType: ApiMessageEntity["type"]): NodeFormat {
  switch (entityType) {
    case ApiMessageEntityTypes.Bold:
      return "bold";
    case ApiMessageEntityTypes.Italic:
      return "italic";
    case ApiMessageEntityTypes.Underline:
      return "underline";
    case ApiMessageEntityTypes.Strike:
      return "strikethrough";
    case ApiMessageEntityTypes.Spoiler:
      return "spoiler";
    case ApiMessageEntityTypes.Pre:
    case ApiMessageEntityTypes.Code:
      return "monospace";
    case ApiMessageEntityTypes.TextUrl:
      return "link";
    case ApiMessageEntityTypes.CustomEmoji:
      return "customEmoji";
    default:
      return "text";
  }
}
