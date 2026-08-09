---
name: doc-write
description: Write or revise the document a flow carries — the article shown in Doc view and at ?embed=doc. Use when adding or editing prose, headings or figures in a flow's `document`, when a section should be clearer or shorter, or when a node should appear as a figure (Dutch cues - "pas de tekst aan", "het artikel", "het verhaal", "het document").
---

# Writing a flow's document

A flow may carry a `document`: an article that explains something, using the
flow's own live nodes as its figures. It is deployed and shared on its own, so
it is public writing rather than internal documentation.

## Register

- **Scientific, plainly worded and a bit enthusiastic — never poetic — written
  for a reader who knows nothing of the subject.** State what a thing is.
  Define each term where it first appears. Use no metaphor the reader has to
  decode before they can use the sentence.
- **Invite rather than embellish.** "Predict the result before you change this
  value" carries the interest; an adjective on the noun does not.
- **Short.** Remove anything that repeats a point already made. Keep every
  sentence carrying a fact the figure beside it cannot supply — what a bar is,
  what a band is, what a label means.
- **Every number is sourced**, either in a file the flow fetches or in a cited
  work linked as `[text](url)`. Where a published specification and the fetched
  file disagree, quote the file.
- **No plumbing.** A request node is not a figure. Machinery belongs in a
  subflow that presents a useful face, or off the page entirely.
- **Offer a title and expect it to be changed** — do not defend it.

## Mechanics

Blocks are `heading` | `text` | `node`, held under the flow's `document` in
`src/app/fixtures.ts`. Inline syntax: `**strong**`, `*em*`, `` `code` ``, `$math$`,
`[text](url)`, `{{nodeId:path}}` for an editable configuration value and
`{{!name:Label}}` for a button the host application handles.

- A figure is `{type: 'node', nodeId, float, width, caption, pin?}`. Set `width`
  for small content, or the float shrink-wraps to the width of its caption.
- **Two figures that answer each other belong back to back.** Prose between them
  is something the reader must scroll past to make the comparison.
- On a narrow screen one figure is pinned per stretch of the page, and a stretch
  begins at every heading and at every figure. A figure not worth a screen of
  its own takes `pin: false`: it then scrolls past normally and releases
  whatever was pinned.
- Headings do not parse inline syntax — no `$…$` in a heading.
- Raise the flow's `seedVersion`, and check the line rather than the number:
  more than one flow declares one.

## Finishing

Update the end-to-end test asserting the document's shape — the figure count and
the `fig-<nodeId>` slot list — since that is what catches a renumbered fixture.
Then read the deployed page at both phone and desktop width before calling it
done.
