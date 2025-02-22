import { ApiFormattedText, ApiMessageEntity, ApiMessageEntityTypes } from "../api/types";
import { getPlainTextFromNode, MessageNode, NodeFormat } from "../components/middle/composer/hooks/useTextEditorState";

interface MarkdownToken {
  start: string;
  end: string;
  type: NodeFormat;
}

// I was referring to the desktop TG for tokens and added my own for cases which I could not reproduce
const markdownTokens: MarkdownToken[] = [
  { start: '**', end: '**', type: 'bold' },
  { start: '__', end: '__', type: 'italic' },
  { start: '~~', end: '~~', type: 'strikethrough' },
  { start: '`',  end: '`',  type: 'monospace' },
  { start: '/*', end: '*/', type: 'spoiler' },
  { start: '++', end: '++', type: 'underline' },
  { start: '```', end: '```', type: 'blockquote'},
  { start: '/`', end: '`/', type: 'pre'},
];

export function parseASTAsFormattedText(nodes: MessageNode[]): ApiFormattedText {
  const formattedNodes = parseMarkdownNodes(mergeAdjacentNodes(nodes));
  const text = formattedNodes.reduce((acc, node) => acc + getPlainTextFromNode(node), '');
  const entities = extractEntitiesFromAST(formattedNodes);

  return {
    text,
    entities
  }
}

function mergeAdjacentNodes(nodes: MessageNode[]): MessageNode[] {
  if (!nodes || nodes.length === 0) return [];
  const result: MessageNode[] = [];
  let current: MessageNode | undefined = undefined;

  const mergeableTypes = new Set(['text', 'emoji']);

  for (const node of nodes) {
    const processedNode: MessageNode = node.children
      ? { ...node, children: mergeAdjacentNodes(node.children) }
      : { ...node };

    if (current && areAttributesEqual(current.attributes, processedNode.attributes)) {
      if (
        mergeableTypes.has(current.type) &&
        mergeableTypes.has(processedNode.type)
      ) {
        current = {
          ...(typeof current === 'object' ? current : {}),
          type: 'text',
          content: (current.content || '') + (processedNode.content || '')
        };
        continue;
      }
      else if (current.type === processedNode.type) {
        if (current.children && processedNode.children) {
          current.children = mergeAdjacentNodes([...current.children, ...processedNode.children]);
        } else {
          current.content = (current.content || '') + (processedNode.content || '');
        }
        continue;
      }
    }
    if (current) {
      result.push(current);
    }
    current = processedNode;
  }
  if (current) {
    result.push(current);
  }
  return result;
}

function areAttributesEqual(
  attr1: Record<string, any> | undefined,
  attr2: Record<string, any> | undefined
): boolean {
  if (attr1 === attr2) return true;
  if (!attr1 || !attr2) return false;
  const keys1 = Object.keys(attr1);
  const keys2 = Object.keys(attr2);
  if (keys1.length !== keys2.length) return false;
  return keys1.every((key) => attr1[key] === attr2[key]);
}

function parseMarkdownNodes(nodes: MessageNode[]): MessageNode[] {
  const result: MessageNode[] = [];
  for (const node of nodes) {
    if (node.type === 'text' && node.content) {
      const parsedNodes = parseMarkdownToAST(node.content);
      result.push(...parsedNodes);
    } else if (['emoji', 'customEmoji'].includes(node.type)) {
      result.push(node);
    } else if (node.children && node.children.length > 0) {
      result.push({
        ...node,
        children: parseMarkdownNodes(node.children),
      });
    } else {
      result.push(node);
    }
  }
  return result;
}

function parseMarkdownToAST(text: string): MessageNode[] {
  const nodes: MessageNode[] = [];
  let pos = 0;
  while (pos < text.length) {
    if (text[pos] === '[') {
      const linkResult = parseMarkdownLink(text, pos);
      if (linkResult) {
        if (pos > 0) {
          nodes.push({ type: 'text', content: text.substring(0, pos) });
        }
        nodes.push(linkResult.node);
        text = text.substring(linkResult.newPos);
        pos = 0;
        continue;
      }
    }

    let nearestIdx = text.length;
    let tokenFound: MarkdownToken | null = null;
    for (const token of markdownTokens) {
      const idx = text.indexOf(token.start, pos);
      if (idx !== -1 && idx < nearestIdx) {
        nearestIdx = idx;
        tokenFound = token;
      }
    }
    if (tokenFound === null) {
      nodes.push({ type: 'text', content: text.slice(pos) });
      break;
    }
    if (nearestIdx > pos) {
      nodes.push({ type: 'text', content: text.slice(pos, nearestIdx) });
    }
    const startMarker = tokenFound.start;
    const endMarker = tokenFound.end;
    const innerStart = nearestIdx + startMarker.length;
    const endIdx = text.indexOf(endMarker, innerStart);
    if (endIdx === -1) {
      nodes.push({ type: 'text', content: text.slice(nearestIdx) });
      break;
    }
    const innerContent = text.slice(innerStart, endIdx);
    const children = parseMarkdownToAST(innerContent);
    if (children.length === 1 && children[0].type === 'text') {
      nodes.push({ type: tokenFound.type, content: children[0].content });
    } else {
      nodes.push({ type: tokenFound.type, children });
    }
    pos = endIdx + endMarker.length;
  }
  return nodes;
}

function extractEntitiesFromAST(
  nodes: MessageNode[],
  baseOffset: number = 0
): ApiMessageEntity[] {
  let entities: ApiMessageEntity[] = [];
  let currentOffset = baseOffset;

  for (const node of nodes) {
    if (node.type === 'text') {
      const text = node.content || "";
      currentOffset += text.length;
    } else {
      const nodeText = getPlainTextFromNode(node);
      const nodeLength = nodeText.length;

      let entityType: ApiMessageEntityTypes | null = null;
      switch (node.type) {
        case 'bold':
          entityType = ApiMessageEntityTypes.Bold;
          break;
        case 'italic':
          entityType = ApiMessageEntityTypes.Italic;
          break;
        case 'underline':
          entityType = ApiMessageEntityTypes.Underline;
          break;
        case 'strikethrough':
          entityType = ApiMessageEntityTypes.Strike;
          break;
        case 'spoiler':
          entityType = ApiMessageEntityTypes.Spoiler;
          break;
        case 'link':
          entityType = ApiMessageEntityTypes.TextUrl;
          break;
        case 'customEmoji':
          entityType = ApiMessageEntityTypes.CustomEmoji;
          break;
        case 'monospace':
          entityType = ApiMessageEntityTypes.Pre;
        case 'pre':
          entityType = ApiMessageEntityTypes.Pre;
        case 'blockquote':
          entityType = ApiMessageEntityTypes.Blockquote;
          break;
        default:
          break;
      }

      if (entityType) {
        entities.push({
          type: entityType,
          offset: currentOffset,
          length: getPlainTextFromNode(node).length,
          documentId: node?.attributes?.id,
          url: node?.attributes?.url
        } as any);
      }

      if (node.children) {
        const childEntities = extractEntitiesFromAST(node.children, currentOffset);
        entities = entities.concat(childEntities);
      }

      currentOffset += nodeLength;
    }
  }

  return entities;
}

function parseMarkdownLink(text: string, pos: number): { node: MessageNode; newPos: number } | null {
  if (text[pos] !== '[') return null;
  const closeBracketIdx = text.indexOf(']', pos);
  if (closeBracketIdx === -1) return null;
  if (text[closeBracketIdx + 1] !== '(') return null;
  const closeParenIdx = text.indexOf(')', closeBracketIdx + 2);
  if (closeParenIdx === -1) return null;

  const linkText = text.substring(pos + 1, closeBracketIdx);
  const url = text.substring(closeBracketIdx + 2, closeParenIdx);
  const children = parseMarkdownToAST(linkText);

  const node: MessageNode = {
    type: 'link',
    children,
    attributes: { url }
  };
  return { node, newPos: closeParenIdx + 1 };
}
