# Plan: a watertight type system for sockets

Status: PROPOSAL — nothing in here is built. Agreed pieces move to issues/commits.

## The problem, stated by its hardest case

A `number` can carry meaning: a temperature, a score, a price. Two demands
pull against each other:

1. A **specific consumer** (a thermostat node) must be able to say "only
   temperatures" — and a bare number must NOT satisfy it.
2. A **generic consumer** (the graph node) must be able to say "any number" —
   and every temperature, score and price must flow straight in.

A single flat name space cannot express both. A structural hash cannot
either: `{x, y}` is a point, a 2D vector and a screen position — same keys,
same hash, different meanings, wrong couplings. Keys say shape, not meaning.

## Core model: two layers, one rule

### Layer 1 — Shape (what the data IS, structurally)

A small closed language, canonicalisable and decidable:

| shape | example |
|---|---|
| `number`, `text`, `boolean` | `3.14` |
| `array(shape, minLength?)` | point = `array(number, 2)` |
| `record({key: shape}, open?)` | `{label: text, value: number}` |
| `opaque(id)` | `function` (a closure — only equal by id) |

- Canonical form: keys sorted, stable JSON. **Hash of that canonical form is
  the signature** — used as a cheap cache key for comparisons, never as the
  truth (Luca's hash idea, placed where it is safe).
- Structural fit is a SUBSET check, not equality: an input record's fields
  must be a subset of the output's (a producer may carry more), arrays and
  tuples check element-wise, `opaque` only matches its own id. Readable
  failures fall out for free: "field `unit` missing", not "hash mismatch".

### Layer 2 — Type (what the data MEANS)

A type is a NAMED refinement of a shape:

```
{ name, module, description, shape, refines?: baseTypeName, color? }
```

- `temperature` refines `number`. `celsius` may refine `temperature`.
- A refinement has the SAME shape as its base. Meaning is a tag, never new
  structure — different structure is a different type, full stop.
- Base types (`number`, `point`, `function`) are shapes with a name and no
  `refines`. They carry no meaning beyond their shape.
- Registry rules stay as built today: name + description is identity,
  a colliding DIFFERENT type registers as `prefix:name`, colours are
  presentation and only fill gaps.

### The one coupling rule

An output of type `O` may connect to an input demanding type `I` iff:

```
O == I,  or  O refines* I        (refines*: the chain, any depth)
```

That single rule satisfies both demands:

- The graph node demands `number` → `temperature` flows in, because
  `temperature refines number`. **Generic consumers demand base types.**
- The thermostat demands `temperature` → a bare `number` is refused, because
  `number` does not refine `temperature`. **Meaning is never free.**
- Direction matters: refinement flows UP to its base, never down.

No implicit conversions. Turning a number INTO a temperature is a node's job
(an explicit "tag" node, or a producer that declares its output type), and
converting celsius→fahrenheit is an ordinary node with an in and an out.

### Wire negotiation (existing engine, generalised)

Today: `format` = HAS, `formats[]` = MAY, compatible = name overlap. The
generalisation: overlap under assignability instead of name equality —
`commonFormats(out, in)` keeps every out-member assignable to some in-member.
Empty still means "anything". The propagation worklist, pruning and the
white-line rules are untouched; only the comparison deepens.

## Display

- A type shows its plain name. The prefix appears ONLY when it was needed
  (`tennis:point`) — shared types have no owner, and `math/number` next to
  `graph/number` would claim a difference that does not exist.
- Tooltip/dialog: description + shape + refinement chain
  ("celsius → temperature → number").
- Colour: a refinement inherits its base's colour unless it declares one.

## Serialisation

Flow JSON keeps storing type NAMES only, exactly as today. Definitions live
in modules and the registry. Unknown names stay tolerated (engine already
skips unknown gracefully) — a flow is data and outlives any registry.

## Build order (each step lands green on its own)

1. **Shape language** in `flow-based-core`: constructors, canonicalise,
   `fitsInto(a, b)` subset check, signature hash. Pure, unit-tested first —
   including the false-positive cases (key permutations, extra fields,
   opaque vs record).
2. **FbFormatDef grows `shape` + `refines`** in the registry; registration
   validates: a refinement's base must exist and share its shape. Identity
   and prefixing rules unchanged.
3. **Engine comparison**: `formatsCompatible`/`commonFormats` consult the
   registry's assignability (injected as a function, so core stays
   framework-free and registry-free).
4. **Modules declare**: math/graphs add shapes to their format defs; demo
   gains one meaningful refinement as the proof (e.g. the generator can tag
   its output `random` refines `number`, and the plot still draws it).
5. **UI**: socket dialog groups the multi-select by base type; connection
   refusal says WHY ("temperature expected, number offered").

## Open questions (decide before step 1)

1. **Strictness**: an input demanding `temperature` refuses a bare `number`.
   Agreed? (Proposal: yes — meaning is opt-in via a tag node; anything looser
   is not watertight.)
2. **Refinement = tag only**: a refinement never adds structure. A
   temperature-with-unit is a record, i.e. a NEW base type. Agreed?
3. **Where the check lives**: engine (connections refused at connect time,
   as today) — or also visually in the palette/socket dialog. Proposal: both,
   same function.
