import { ApiMessageEntityTypes, ApiSticker } from "../../../../api/types";
import { useState } from "../../../../lib/teact/teact";
import renderText from "../../../common/helpers/renderText";
import { buildCustomEmojiHtml } from "../helpers/customEmoji";

export type NodeFormat =
| 'text'
| 'bold'
| 'italic'
| 'underline'
| 'strikethrough'
| 'monospace'
| 'spoiler'
| 'link'
| 'emoji'
| 'customEmoji'
| 'blockquote'
| 'pre'
| 'br';

export interface MessageNode {
  type: NodeFormat;
  content?: string;
  attributes?: Record<string, any>;
  children?: MessageNode[];
}

export interface CaretPosition {
  start: number;
  end: number;
}

export function useEditorState(initialValue: MessageNode[], initialCaretPosition: any) {
  const [nodes, setNodes] = useState<MessageNode[]>(initialValue);
  const [caretPosition, setCaretPosition] = useState<any>(initialCaretPosition);

  return {
    nodes,
    caretPosition,
    setNodes,
    setCaretPosition
  };
}

export function insertNode(
  nodes: MessageNode[],
  newNode: MessageNode,
  position: number,
): MessageNode[] {
  let currentPos = 0;
  const newNodes: MessageNode[] = [];
  let isInserted = false;

  for (const node of nodes) {
    const nodeText = getPlainTextFromNode(node);
    const nodeLength =  ['emoji', 'customEmoji'].includes(node.type) ? 1 : nodeText.length;
    if (currentPos + nodeLength < position) {
      newNodes.push(node);
    } else if (currentPos <= position && currentPos + nodeLength == position) {
      const offset = position - currentPos;
      const before = nodeText.slice(0, offset);

      if (before) {
        newNodes.push(node);
      }

      if(!isInserted) {
        newNodes.push(newNode);
        isInserted = true;
      }
    } else {
      newNodes.push(node);
    }
    currentPos += nodeLength;
  }
  return newNodes;
}

export function deleteNode(
  nodes: MessageNode[],
  range: CaretPosition,
): MessageNode[] {
  let currentPos = 0;
  const newNodes: MessageNode[] = [];

  for (const node of nodes) {
    const nodeText = getPlainTextFromNode(node);
    const isEmoji = ['emoji', 'customEmoji'].includes(node.type);
    const nodeLength = isEmoji ? 1 : nodeText.length;
    if (isEmoji && currentPos >= range.start && currentPos < range.end) {
      currentPos += nodeLength;
      continue;
    }

    if (currentPos + nodeLength < range.start || currentPos > range.end) {
      newNodes.push(node);
    } else {
      const startInNode = Math.max(0, range.start - currentPos);
      const endInNode = Math.min(nodeLength, range.end - currentPos);
      const newText = nodeText.slice(0, startInNode) + nodeText.slice(endInNode);

      if (newText) {
        if (node.type !== 'text' && !isEmoji) {
          newNodes.push(updateDeepest(node, newText));
        } else {
          newNodes.push(node);
        }
      }
    }

    currentPos += nodeLength;
  }
  if(!newNodes.length) {
    newNodes.push({ type: 'text', content: '' });
  }
  return newNodes;
}

export function applyFormatting(
  nodes: MessageNode[],
  rangeStart: number,
  rangeEnd: number,
  format: NodeFormat,
  attributes?: Record<string, any>
): MessageNode[] {
  let currentOffset = 0;
  const result: MessageNode[] = [];
  console.log('attributes', attributes)
  for (const node of nodes) {
    const nodeLength = getMessageNodeLength(node);
    const nodeStart = currentOffset;
    const nodeEnd = currentOffset + nodeLength;

    if (nodeEnd <= rangeStart || nodeStart >= rangeEnd) {
      // if it is not selected - keep it as it is
      result.push(node);
    } else {
      if (node.type === 'text') {
        let text = getPlainTextFromNode(node);

        const relativeStart = Math.max(0, rangeStart - currentOffset);
        const relativeEnd = Math.min(text.length, rangeEnd - currentOffset);

        if (relativeStart > 0) {
          result.push({ type: 'text', content: text.slice(0, relativeStart) });
        }

        if (relativeEnd > relativeStart) {
          result.push({
            type: format,
            attributes,
            children: [{ type: 'text', content: text.slice(relativeStart, relativeEnd) }]
          });
        }

        if (relativeEnd < text.length) {
          result.push({ type: 'text', content: text.slice(relativeEnd) });
        }
      } else if (node.children) {
        // some formatted text
        const newChildren = applyFormatting(
          node.children,
          Math.max(0, rangeStart - currentOffset),
          Math.max(0, rangeEnd - currentOffset),
          format,
          attributes
        );

        result.push({ ...node, children: newChildren });
      } else {
        // something that is not text
        result.push(node);
      }
    }
    currentOffset += nodeLength;
  }
  return result;
}

export function removeFormatting(
  nodes: MessageNode[],
  rangeStart: number,
  rangeEnd: number,
  format: NodeFormat
): MessageNode[] {
  let currentOffset = 0;
  const result: MessageNode[] = [];

  for (const node of nodes) {
    const nodeLength = getMessageNodeLength(node);
    const nodeStart = currentOffset;
    const nodeEnd = currentOffset + nodeLength;

    if (nodeEnd <= rangeStart || nodeStart >= rangeEnd) {
      // if it is not selected - keep it as it is
      result.push(node);
    } else {
      // new positions for child nodes
      const childStart = Math.max(0, rangeStart - currentOffset);
      const childEnd = Math.min(getMessageNodeLength(node), rangeEnd - currentOffset);
      const newChildren = node.children && node.children.length > 0
        ? removeFormatting(node.children, childStart, childEnd, format)
        : [];

      if (node.type === format) {
        // if it is a suitable format - exchange it on his children
        if(node.children) {
          result.push(...newChildren);
        }
      } else if (node.children && node.children.length > 0) {
        result.push({ ...node, children: newChildren });
      } else {
        // if it is not a formatted text - keep it as it is
        result.push(node);
      }
    }
    currentOffset += nodeLength;
  }
  return result;
}

export const getPlainTextFromNode = (node: MessageNode): string => {
  if (node.content !== undefined) {
    return node.content;
  }
  if (node.children && node.children.length > 0) {
    return node.children.map(getPlainTextFromNode).join('');
  }
  return '';
};

export function getMessageNodeLength(node: MessageNode): number {
  return ['emoji', 'customEmoji'].includes(node.type) ? 1 : getPlainTextFromNode(node).length;
}

export function deleteSelectedNodes(nodes: MessageNode[], caretPosition: CaretPosition): MessageNode[] {
  let updatedNodes = nodes;
  if (caretPosition.start !== caretPosition.end) {
    updatedNodes = deleteNode(updatedNodes, caretPosition);
  }

  return updatedNodes;
}

export const getNodesPlainText = (nodes: MessageNode[]): string => {
  return nodes.map(getPlainTextFromNode).join('');
}

export const getNodesPlainTextLength = (nodes: MessageNode[]): number => {
  return nodes.reduce((acc: number, node: MessageNode) => {
    if(['emoji', 'customEmoji'].includes(node.type)) {
      return acc + 1;
    }

    return acc + getPlainTextFromNode(node).length;
  }, 0);
}

export function restoreSelection(
  containerEl: HTMLElement,
  savedSel: { start: number; end: number } | null
) {
  if (!savedSel) return;
  const range = document.createRange();
  const treeWalker = document.createTreeWalker(
    containerEl,
    NodeFilter.SHOW_TEXT,
    null
  );
  let charCount = 0;
  let currentNode: Node | null = null;
  let startNode: Node | null = null;
  let startOffset = 0;
  let endNode: Node | null = null;
  let endOffset = 0;

  while ((currentNode = treeWalker.nextNode())) {
    const nodeText = currentNode.textContent || "";
    const nextCharCount = charCount + nodeText.length;
    if (!startNode && savedSel.start >= charCount && savedSel.start <= nextCharCount) {
      startNode = currentNode;
      startOffset = savedSel.start - charCount;
    }
    if (!endNode && savedSel.end >= charCount && savedSel.end <= nextCharCount) {
      endNode = currentNode;
      endOffset = savedSel.end - charCount;
      if (savedSel.start === savedSel.end) break;
    }
    if (startNode && endNode) break;
    charCount = nextCharCount;
  }
  if (startNode) {
    range.setStart(startNode, startOffset);
    if (endNode) {
      range.setEnd(endNode, endOffset);
    } else {
      range.collapse(true);
    }
  }
  const sel = window.getSelection();
  if (sel) {
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

export function placeCaretAtEnd(el: HTMLElement) {
  if (typeof window.getSelection !== "undefined" && typeof document.createRange !== "undefined") {
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    if (sel) {
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }
}

export function isRangeUniformlyFormatted(
  nodes: MessageNode[],
  rangeStart: number,
  rangeEnd: number,
  format: NodeFormat,
  inheritedFormatted: boolean = false
): boolean {
  let currentOffset = 0;
  for (const node of nodes) {
    const nodeLength = getMessageNodeLength(node);
    const nodeStart = currentOffset;
    const nodeEnd = currentOffset + nodeLength;

    if (nodeEnd <= rangeStart || nodeStart >= rangeEnd) {
      currentOffset += nodeLength;
      continue;
    }

    const effectiveFormatted = inheritedFormatted || (node.type === format);

    if (node.type === 'text') {
      if (!effectiveFormatted) {
        return false;
      }
    } else if (node.children && node.children.length > 0) {
      const childStart = Math.max(0, rangeStart - currentOffset);
      const childEnd = Math.min(getMessageNodeLength(node), rangeEnd - currentOffset);
      if (!isRangeUniformlyFormatted(node.children, childStart, childEnd, format, effectiveFormatted)) {
        return false;
      }
    } else {
      if (!effectiveFormatted) {
        return false;
      }
    }
    currentOffset += nodeLength;
  }
  return true;
}

export function getHTML(nodes: MessageNode[]): string {
  return nodes.map((node) => {
    switch (node.type) {
      case 'text':
        return escapeHtml(node.content ?? '');

      case 'br':
        return '<br>';

      case 'bold':
        return `<strong>${getHTML(node.children ?? [])}</strong>`;

      case 'italic':
        return `<em>${getHTML(node.children ?? [])}</em>`;

      case 'underline':
        return `<u>${getHTML(node.children ?? [])}</u>`;

      case 'strikethrough':
        return `<s>${getHTML(node.children ?? [])}</s>`;

      case 'monospace':
        return `<code class="text-entity-code" dir="auto">${getHTML(node.children ?? [])}</code>`;

      case 'spoiler':
        return `<span class="spoiler" data-entity-type="">${getHTML(node.children ?? [])}</span>`

      case 'link':
        console.log('linklink', node.attributes)
        const href = node.attributes?.url || '#';
        return `<a href="${href}" class="text-entity-link" dir="auto">${getHTML(node.children ?? [])}</a>`;

      case 'emoji':
        const newemojiHtml = renderText(node.content ?? '', ['escape_html', 'emoji_html', 'br_html'])
          .join('')
          .replace(/\u200b+/g, '\u200b') + '\u200B';

        return newemojiHtml;

      case 'customEmoji':
        const emoji = node.attributes as ApiSticker;
        const newHtml = emoji ? buildCustomEmojiHtml(emoji) + '\u200B' : '';
        return newHtml;

      case 'pre':
        return `\`\`\`${renderText(node?.attributes?.language || '', ['escape_html'])}<br/>${node.content}<br/>\`\`\`<br/>`;

      case 'blockquote':
        return `<blockquote
          class="blockquote"
          data-entity-type="${ApiMessageEntityTypes.Blockquote}"
          >${node.content}</blockquote>`;

      default:
        return escapeHtml(node.content ?? '');
    }
  }).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function updateDeepest(node: MessageNode, newText: string): MessageNode {
  if (!node.children || node.children.length === 0) {
    return node.type === 'text' ? { ...node, content: newText } : node;
  }
  const updatedChildren = [...node.children];
  const lastIndex = updatedChildren.length - 1;
  updatedChildren[lastIndex] = updateDeepest(updatedChildren[lastIndex], newText);
  return { ...node, children: updatedChildren };
}


