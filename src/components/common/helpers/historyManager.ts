import { MessageNode } from "../../middle/composer/hooks/useTextEditorState";

export interface HistoryEntry {
  state: MessageNode[];
  boundary: boolean;
}

export class HistoryManager {
  private history: HistoryEntry[] = [];
  private future: HistoryEntry[][] = [];

  constructor(initialState: MessageNode[]) {
    this.history.push({ state: initialState, boundary: true });
  }

  saveState(newState: MessageNode[], boundary = false): void {
    this.future = [];
    this.history.push({ state: newState, boundary });
  }

  undo(): MessageNode[] | null {
    if (this.history.length <= 1) {
      return null;
    }

    const undoneGroup: HistoryEntry[] = [];
    let entry = this.history.pop()!;
    undoneGroup.push(entry);

    while (this.history.length > 0 && !this.history[this.history.length - 1].boundary) {
      entry = this.history.pop()!;
      undoneGroup.push(entry);
    }

    undoneGroup.reverse();
    this.future.push(undoneGroup);

    return this.history[this.history.length - 1].state;
  }

  redo(): MessageNode[] | null {
    if (this.future.length === 0) {
      return null;
    }

    const group = this.future.pop()!;
    for (const entry of group) {
      this.history.push(entry);
    }

    return this.history[this.history.length - 1].state;
  }

  clearHistory(): void {
    this.history = [];
    this.future = [];
  }
}
