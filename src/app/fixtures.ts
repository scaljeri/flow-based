/**
 * The flow a fresh browser opens with: a generator feeding a tap, on a plane.
 *
 * Deliberately small. It shows what the editor IS — something produces values,
 * something reads them, and the line between them is the program — and it fits
 * a phone. The two showcase articles used to live here as `demo()` and `tno()`,
 * hundreds of lines of hand-built graph each; they now ship as standalone flow
 * files under `assets/flows/` and are opened by loading them, not by bundling
 * them into the app. A specific case is a flow you load, not code in `src/app`.
 *
 * Hand-writing a fixture, three things that have each cost real time: connection
 * ids must be unique per flow (a duplicate silently REPLACES the first wire and
 * that part of the flow stops being fed); positions are percentages and a
 * node's label sits BELOW its box, so check the flow view after moving one; and
 * the tap's input declares no format on purpose — it takes one from whatever it
 * is connected to, which is the engine's format propagation doing its job.
 */
export const basic = {
  id: 1,
  type: 'flow',
  /*
   * The document, not its contents. It was called "Random numbers", which
   * described the two nodes that happen to be in it — and read as nonsense the
   * moment anything else was added: a subflow with no random numbers in it
   * showed up under "Random numbers ›".
   */
  title: 'main',
  sockets: [],
  children: [
    {
      type: 'graph-plane',
      title: 'Complex plane',
      id: 900,
      sockets: [{ id: 910, type: 'in', formats: ['number', 'point'] }],
      ui: { position: { x: 27, y: 48 } },
    },
    {
      type: 'random-numbers',
      title: 'Random number generator',
      id: 100,
      // Behaviour only — the settings panel's slider bounds no longer travel
      // in a flow file.
      config: {
        start: 0,
        end: 1,
        interval: 1000,
        integer: true,
      },
      sockets: [{ id: 110, type: 'out', format: 'number' }],
      ui: { position: { x: 6, y: 34 } },
    },
    {
      type: 'tap',
      title: 'Logger',
      id: 200,
      config: { expanded: false },
      sockets: [
        { id: 210, type: 'in' },
        { id: 211, type: 'out' },
      ],
      ui: { position: { x: 34, y: 18 } },
    },
  ],
  connections: [{ id: 1000, from: 100, to: 200, out: 110, in: 210 }],
};
