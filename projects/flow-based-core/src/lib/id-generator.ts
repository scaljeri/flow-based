/**
 * Monotonic id source for nodes, sockets and connections.
 *
 * Replaces two independent timestamp-based generators — `Date.now() + ++counter`
 * in Flow and a module-level `let uniqueId = Date.now()` in FlowBasedService —
 * which had three problems (docs/AUDIT.md §3.8):
 *
 * - `Date.now() + counter` collides trivially with itself: t=1000,c=2 and
 *   t=1001,c=1 produce the same number.
 * - The two generators could collide with each other, since both were seeded
 *   from the wall clock.
 * - Ids differed on every run, so no fixture was reproducible and tests could
 *   not assert on them.
 *
 * `observe()` keeps ids unique against a flow loaded from JSON: existing ids are
 * usually old timestamps, so the counter is advanced past the highest one seen
 * rather than starting from zero and colliding.
 */
export class IdGenerator {
  private nextId = 1;

  /** Advance past `id` so it is never handed out again. */
  observe(id: number | undefined | null): void {
    // SAFE integer, not merely finite: an id near 2^53 (a bad generator, a
    // hand-edited flow) made `nextId = id + 1` round back to `id`, so create()
    // then handed out that same id forever — every new node collided. A safe,
    // positive id advances the counter; anything else is ignored.
    if (typeof id === 'number' && Number.isSafeInteger(id) && id > 0 && id >= this.nextId) {
      this.nextId = id + 1;
    }
  }

  /** Walk a flow tree and observe every id it already contains. */
  observeFlow(state: { id?: number; sockets?: { id?: number }[]; connections?: { id: number }[]; children?: unknown[] }): void {
    this.observe(state.id);
    (state.sockets ?? []).forEach(socket => this.observe(socket.id));
    (state.connections ?? []).forEach(connection => this.observe(connection.id));
    (state.children ?? []).forEach(child => this.observeFlow(child as Parameters<IdGenerator['observeFlow']>[0]));
  }

  create(): number {
    return this.nextId++;
  }
}
