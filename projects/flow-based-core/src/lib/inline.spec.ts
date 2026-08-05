import { describe, expect, it } from 'vitest';
import { isDisplayMath, parseInline } from './inline';

describe('parseInline', () => {
  it('leaves plain text alone', () => {
    expect(parseInline('just words')).toEqual([{ type: 'text', text: 'just words' }]);
  });

  it('keeps the text around a token', () => {
    expect(parseInline('a **b** c')).toEqual([
      { type: 'text', text: 'a ' },
      { type: 'strong', text: 'b' },
      { type: 'text', text: ' c' },
    ]);
  });

  it('prefers the longer opener, so ** is bold and $$ is a display formula', () => {
    expect(parseInline('**b**')).toEqual([{ type: 'strong', text: 'b' }]);
    expect(parseInline('$$x$$')).toEqual([{ type: 'math', tex: 'x', display: true }]);
    expect(parseInline('$x$')).toEqual([{ type: 'math', tex: 'x', display: false }]);
  });

  it('reads code, italics and links', () => {
    expect(parseInline('`f(x)` *and* [docs](https://example.com)')).toEqual([
      { type: 'code', text: 'f(x)' },
      { type: 'text', text: ' ' },
      { type: 'em', text: 'and' },
      { type: 'text', text: ' ' },
      { type: 'link', text: 'docs', href: 'https://example.com' },
    ]);
  });

  it('does not treat a script URL as a link', () => {
    // Rendered as the text it looked like, so a rejected link is visible rather
    // than silently vanishing.
    expect(parseInline('[click](javascript:alert(1))')).toEqual([
      { type: 'text', text: '[click](javascript:alert(1))' },
    ]);
    expect(parseInline('[x](data:text/html,<script>)')).toEqual([
      { type: 'text', text: '[x](data:text/html,<script>)' },
    ]);
  });

  it('allows relative links, which cannot carry a scheme', () => {
    expect(parseInline('[a](./page)')).toEqual([
      { type: 'link', text: 'a', href: './page' },
    ]);
  });

  it('never yields markup, whatever the input says', () => {
    const tokens = parseInline('<img src=x onerror=alert(1)> **<b>**');

    // Angle brackets survive as TEXT — the renderer sets textContent, so there is
    // no path from document JSON to innerHTML.
    expect(tokens[0]).toEqual({ type: 'text', text: '<img src=x onerror=alert(1)> ' });
    expect(tokens[1]).toEqual({ type: 'strong', text: '<b>' });
  });

  it('leaves a lone marker as text rather than swallowing the rest', () => {
    expect(parseInline('2 * 3 = 6')).toEqual([{ type: 'text', text: '2 * 3 = 6' }]);
    expect(parseInline('costs $5 today')).toEqual([{ type: 'text', text: 'costs $5 today' }]);
  });

  it('reads a formula spanning several lines', () => {
    const tokens = parseInline('$$\n\\sum_i x_i\n$$');

    expect(tokens).toEqual([{ type: 'math', tex: '\\sum_i x_i', display: true }]);
  });

  it('reads a config input reference', () => {
    expect(parseInline('with a = {{400:params.a}} here')).toEqual([
      { type: 'text', text: 'with a = ' },
      { type: 'input', nodeId: 400, path: 'params.a' },
      { type: 'text', text: ' here' },
    ]);
  });

  it('leaves a malformed config reference as text', () => {
    // No node id, a path that starts with a digit, an empty path: none of
    // these are references, and swallowing them would hide the typo.
    expect(parseInline('{{params.a}}')).toEqual([{ type: 'text', text: '{{params.a}}' }]);
    expect(parseInline('{{400:1a}}')).toEqual([{ type: 'text', text: '{{400:1a}}' }]);
    expect(parseInline('{{400:}}')).toEqual([{ type: 'text', text: '{{400:}}' }]);
  });
});

describe('isDisplayMath', () => {
  it('recognises a paragraph that is only a display formula', () => {
    expect(isDisplayMath(parseInline('$$x^2$$'))).toBe(true);
    expect(isDisplayMath(parseInline('see $$x^2$$'))).toBe(false);
    expect(isDisplayMath(parseInline('$x^2$'))).toBe(false);
  });
});

describe('action tokens', () => {
  it('reads a named action with its label', () => {
    expect(parseInline('now {{!flow:Show the flow}} and read on')).toEqual([
      { type: 'text', text: 'now ' },
      { type: 'action', action: 'flow', text: 'Show the flow' },
      { type: 'text', text: ' and read on' },
    ]);
  });

  it('does not mistake a config input for an action, or the reverse', () => {
    expect(parseInline('{{400:params.a}}')).toEqual([
      { type: 'input', nodeId: 400, path: 'params.a' },
    ]);
    expect(parseInline('{{!flow:}}')).toEqual([{ type: 'text', text: '{{!flow:}}' }]);
  });
});
