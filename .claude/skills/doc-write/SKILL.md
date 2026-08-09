---
name: doc-write
description: Write or rewrite the document a flow carries — the article shown in Doc view and at ?embed=doc. Use when adding or editing prose, headings or figures in a flow's `document`, when the user asks for a section to be clearer, shorter or retitled, or when a new node should appear as a figure.
---

# Writing a flow's document

A flow's `document` is an article that teaches something, with the flow's own
live nodes as its figures. It is deployed and shared standalone, so it is
public writing, not a comment.

## The style, which is Luca's and not negotiable

- **Scientific, a bit enthusiastic, written for dummies.** Never poetic. State
  what a thing is; define each term as it arrives; no metaphor the reader has to
  decode first.
- **The enthusiasm is in the invitation** — "predict the result before you turn
  this knob" — never in an adjective on the noun.
- **Short.** Cut anything that repeats a point already made. Keep every sentence
  that carries a fact the figure beside it cannot give: what a bar is, what a
  band is, what a label means.
- **Every number is sourced** — in a file the flow fetches, or in a cited paper
  linked with `[text](url)`. Where a published spec and the fetched file
  disagree, quote the file.
- **No plumbing.** A request node is not a figure. Machinery goes into a subflow
  that wears a useful face, or off the page.
- **Titles are Luca's call.** Offer one, do not defend it.

## The mechanics

Blocks are `heading` | `text` | `node`, in `fixtures.ts` under the flow's
`document`. Inline: `**strong**`, `*em*`, `` `code` ``, `$math$`,
`[text](url)`, `{{nodeId:path}}` for an editable config value, and
`{{!name:Label}}` for a button the host handles.

- A figure is `{type: 'node', nodeId, float, width, caption, pin?}`. Set `width`
  on small content or the float shrink-wraps to its caption.
- **Two figures that answer each other go back to back** — prose between them is
  something the reader has to scroll past to make the comparison.
- On a narrow screen one figure pins per stretch of the page, and a stretch
  begins at every heading AND every figure. A figure not worth a screen of its
  own takes `pin: false`; it then scrolls past and un-pins whatever was held.
- Headings do NOT parse inline: no `$…$` in a heading.
- Bump the flow's `seedVersion` — **check the LINE, not just the number**, more
  than one flow has one.

## Finish

Update the e2e that asserts the document's shape (figure count and the
`fig-<nodeId>` slot list) — it is what catches a renumbered fixture. Then read
the deployed page at phone width and at desktop width before saying it is done,
and send Luca a screenshot.

If he corrects the wording, write the correction into the
`document-writing-style` memory the same turn, in his words.
