import { Injectable } from '@angular/core';
import { FbNodeEventCallback, FbNodeState, FbNodeWorker, FbSocket, Flow } from '@scaljeri/flow-based-core';
import { FbEditor } from '@scaljeri/flow-based-lit';

export interface ExternalEvent {
  type: string;
  payload: unknown;
  nodeId: number;
}

/**
 * The app-facing handle on the editor.
 *
 * Almost everything this used to do now lives in {@link FbEditor}, which is
 * framework-free: the graph, ids, history, node events and the mutations. What
 * is left is the Angular-shaped part — an injectable that knows which editor is
 * on screen, so an app's own toolbar can drive it without threading a reference
 * through its component tree.
 *
 * Still a root singleton, and still a stack, which is the honest description of
 * what it always was. Two editors on one page share this service, so the last one
 * activated is the one a toolbar talks to (docs/AUDIT.md).
 */
@Injectable({
  providedIn: 'root'
})
export class FlowBasedService {
  private readonly editors: FbEditor[] = [];

  /** The editor currently on screen, if one is. */
  get editor(): FbEditor | undefined {
    return this.editors[0];
  }

  get flow(): Flow | undefined {
    return this.editor?.flow;
  }

  activate(editor: FbEditor): void {
    this.editors.unshift(editor);
  }

  deactivate(editor: FbEditor): void {
    const index = this.editors.indexOf(editor);

    if (index !== -1) {
      this.editors.splice(index, 1);
    }
  }

  /* ----------------------------------------------------------------------
     Mutations
     ---------------------------------------------------------------------- */

  add(flowType: string): FbNodeState | undefined {
    return this.editor?.addNode(flowType);
  }

  delete(state: FbNodeState): void {
    if (state.id !== undefined) {
      this.editor?.removeNode(state.id);
    }
  }

  removeSocket(socket: FbSocket): void {
    this.captureHistory();
    this.editor?.flow.removeSocket(socket);
  }

  /**
   * Snapshot the current flow as an undo point. Must be called BEFORE a mutation,
   * because the engine edits state in place.
   */
  captureHistory(): void {
    const editor = this.editor;

    if (editor) {
      editor.history.capture(editor.state);
    }
  }

  undo(): void {
    this.editor?.undo();
  }

  redo(): void {
    this.editor?.redo();
  }

  // May be undefined: a node type with neither a worker nor isFlow has none.
  getWorker(id: number): FbNodeWorker | undefined {
    return this.editor?.flow.getWorker(id);
  }

  /* ----------------------------------------------------------------------
     Events addressed to node content
     ---------------------------------------------------------------------- */

  triggerEvent(type: string, payload?: unknown): void {
    this.editor?.events.trigger(type, payload);
  }

  register(id: number, callback: FbNodeEventCallback, type?: string): void {
    this.editor?.events.register(id, callback, type);
  }

  unregister(id: number, type?: string): void {
    this.editor?.events.unregister(id, type);
  }

  unregisterAll(id: number): void {
    this.editor?.events.unregisterAll(id);
  }
}
