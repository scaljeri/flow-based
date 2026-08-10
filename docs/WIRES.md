# What a wire is

The engine's connection semantics, stated once. Every choice here is a
simplification of classical flow-based programming, made deliberately for a
live, in-browser editor — the mistake would not be the simplifying, it would
be leaving the substitute semantics unsaid.

## A connection holds one value

A wire is capacity-1, latest-value. There is no queue and no back-pressure: a
producer that emits twice before a consumer reads has overwritten the first
value, and that is the intended meaning — the wire carries *what is*, not
*what happened*. A newly wired consumer receives the current value
immediately (the engine's input bridge replays it), so wiring something up
mid-run behaves like plugging a meter into a live circuit.

Classical FBP uses bounded queues and suspends fast producers; that is the
right call for batch pipelines and the wrong one for a canvas where every
value is also a picture. Nodes that need "what happened" keep their own
history, as the tap does.

## Fan-in interleaves

An input accepts any number of wires. Every packet arrives one by one, in
arrival order, and the node handles them one by one — the Node-RED and Pure
Data model. The engine merges the wires into one stream per socket, so a
node (including every custom node yet to be written) never knows how many
wires feed it. A socket that means one thing — "the one function to plot" —
declares `fan: false` and takes a single connection.

## Fan-out copies

An output feeds any number of wires, and when it feeds more than one, every
consumer gets its own copy of each packet. Two consumers sharing one mutable
object is the shared-state bug class this paradigm exists to eliminate. A
single consumer receives the original — the common case pays nothing.

## Only data travels

Nothing executable crosses a wire. A function travels as its expression
string and consumers compile it themselves. This is fifty years of practice
(Pd messages, Simulink signals, Node-RED msgs), and it is also what makes a
flow a *file*: openable, diffable, shareable without running anything.

## A moment is a packet

There is no second kind of connection for events. A press, a tick, a "fetch
now" all travel as ordinary values — clocks and triggers emit a monotone
count so consecutive moments are distinguishable — and any value arriving at
a moment-shaped input (net-request's `when`, gate's `open`, unit-delay's
`step`) is the nudge. One consequence to know: because wires replay their
latest value, wiring a consumer to an already-pressed trigger delivers that
last press once.

## Multi-input nodes wait for all, then track the latest

The house idiom for a node with several named inputs (an operator's `a` and
`b`) is combineLatest: it fires once every input has a value, then on every
change, over the latest value of each. Never zip — zip pairs by index and
buffers the faster stream without bound.

## A cycle needs a unit-delay

Cycles are legal and the engine reports them rather than breaking them. But
a cycle without a delay element is a synchronous recursion with no bottom,
so the unit-delay node — advancing only on its `step` input — is the visible
license to close one: clocked, a loop advances one step per tick.

## A failure travels too

No wire ever errors in the RxJS sense — an errored observable would kill
every downstream subscription permanently. A node that fails converts the
failure to data (net-request emits `{meta, value: null}`) or goes silent and
says why on the node itself. Downstream is owed an answer even when the
answer is that there is none.
