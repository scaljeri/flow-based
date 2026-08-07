/**
 * Monaco, fetched when a script node is actually opened.
 *
 * It is several megabytes, and a flow with no code in it should not pay for an
 * editor nobody opened. One promise, shared: two script nodes open at once
 * download it once.
 *
 * The paths have no `esm/vs` in them on purpose: the package's own exports
 * map sends `monaco-editor/x` to `esm/vs/x.js`, and spelling the real
 * directory is the one thing it refuses. The grammar moved too — 0.56 keeps
 * the definitions under `languages/definitions/<name>/register`, not under
 * `basic-languages`.
 *
 * Deliberately NOT the `monaco-editor` entry point, which pulls in every
 * language it knows and a TypeScript compiler to check them with. This is the
 * editor plus one Monarch grammar for JavaScript: colouring, folding,
 * brackets, multiple cursors — everything that is editing rather than
 * understanding. Understanding needs a web worker per language, which is the
 * part that costs megabytes, and this node is for ten lines of reshaping
 * rather than for writing a program in.
 */
type MonacoApi = typeof import('monaco-editor/editor/editor.api');

let loading: Promise<MonacoApi> | undefined;

export function monaco(): Promise<MonacoApi> {
  if (!loading) {
    loading = boot();
  }

  return loading;
}

async function boot(): Promise<MonacoApi> {
  /*
   * Monaco asks the page where to find its workers before it will start. With
   * no language service loaded nothing ever posts to one, but the question is
   * still asked — so it gets a worker that listens and does nothing, rather
   * than an exception at the first keystroke.
   */
  const idle = URL.createObjectURL(new Blob(['self.onmessage=()=>{}'], { type: 'text/javascript' }));

  (self as unknown as { MonacoEnvironment?: unknown }).MonacoEnvironment = {
    getWorker: () => new Worker(idle),
  };

  const [api] = await Promise.all([
    import('monaco-editor/editor/editor.api'),

    // The grammar, which is what makes it look like code rather than text.
    import('monaco-editor/languages/definitions/javascript/register'),

    stylesheet(),
  ]);

  return api;
}

/**
 * Monaco's own stylesheet, which the bundler will not load for us.
 *
 * The editor is not styled so much as DRAWN in CSS: cursors, the selection,
 * the scrollbar and every token colour are rules, and without them it renders
 * as a bare textarea over unstyled spans. The build emits the CSS the lazy
 * chunk imports, but a chunk of JavaScript does not fetch its own stylesheet
 * — so this does, from a bundle named in `angular.json` precisely so its name
 * survives the hashing and can be written here.
 *
 * Resolved against `baseURI` because the playground serves this app from a
 * subdirectory, where a root-relative path is a 404.
 */
function stylesheet(): Promise<void> {
  const href = new URL('monaco.css', document.baseURI).href;

  if (document.querySelector(`link[href="${href}"]`)) {
    return Promise.resolve();
  }

  return new Promise(resolve => {
    const link = document.createElement('link');

    link.rel = 'stylesheet';
    link.href = href;

    // Either way: an editor with no colours beats no editor at all.
    link.onload = () => resolve();
    link.onerror = () => resolve();

    document.head.appendChild(link);
  });
}
