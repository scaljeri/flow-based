/**
 * The flow the demo opens with: a generator feeding a tap.
 *
 * Deliberately two nodes. The previous default was an eight-node showcase, which
 * is a fine demonstration and a poor starting point — it opens on a screen full
 * of overlapping fractals with nothing obvious to do, and on a phone it does not
 * fit at all. Two nodes and one connection show what the editor IS: something
 * produces values, something reads them, and the line between them is the
 * program.
 *
 * The tap's input declares no format on purpose. It takes one from whatever it
 * is connected to, which is the engine's format propagation doing its job — and
 * it means this fixture keeps working if the generator's type ever changes.
 *
 * Hand-writing fixtures in this file, four things that have each cost real
 * time: connection ids must be unique per flow (a duplicate silently REPLACES
 * the first wire and that part of the flow stops being fed); more than one
 * flow declares a seedVersion, so bump the right line, not the first match;
 * positions are percentages and a node's label sits BELOW its box, so check
 * the flow view after moving one; and the `basic` and `demo` fixtures share
 * node ids 200 and 900, so a search by id can land in the wrong flow.
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


/**
 * The demo a fresh browser opens with: every part of the story on one screen.
 *
 * A formula produces e^((b·i − a)·x), and the derivative node turns it into
 * its symbolic slope: the orange lines carry FUNCTIONS, not numbers. Samplers
 * make those functions data for two time-series plots and the complex plane,
 * and a second chain draws the pure circle e^(i·b·x) and, off the same
 * sampler, its two coordinates as waves — that pair is what the document is
 * for. It needs the math and graphs modules, which the app enables before
 * loading it.
 *
 * A function, because ids must be fresh per creation — the demo can be
 * recreated next to flows that already borrowed these numbers.
 */
export const demo = () => ({
  id: 1,
  type: 'flow',
  title: 'demo',
  // Bumped when the fixture changes shape; the app reseeds on mismatch.
  config: { seedVersion: 26 },
  /*
   * The flow, read as a document. It used to be a nine-section course that
   * ended on a damped spiral and a symbolic derivative, which is more than a
   * reader who came for "what is an imaginary number" can carry — so the
   * ladder is now four rungs and one payoff: a line cannot turn → so name
   * the quarter turn i and the numbers gain a plane → e puts that turn into
   * every step, so you walk a circle and never leave it → the two
   * coordinates of that walk ARE the cosine and the sine.
   *
   * The voice is plain and explanatory, not literary: state what a thing is,
   * define the words as they arrive, and let the pictures carry the wonder.
   * The opening section earns its geometry rather than asserting it: the
   * reader multiplies by i four times, lands back at 1, and only THEN gets a
   * second axis to put those four values on — because a quarter turn cannot
   * be claimed before there is a plane to turn in. An earlier draft called
   * multiplying by -1 a half turn and halved it, which put the conclusion
   * before the scenery and lost people exactly there.
   * An earlier draft opened with plucked strings and buoys, which reads well
   * and teaches nothing — a reader who does not yet know what i is cannot
   * spend attention on decoding a metaphor.
   *
   * The figures are not screenshots: each one mounts the node's live
   * content, so the circle in the prose is the circle the editor draws,
   * still computing. Every inline {{node:path}} pill sits in the section
   * whose figure it visibly moves, because a knob whose consequence is
   * off-screen teaches nothing — and all three point at math-formula nodes,
   * the only workers that apply a config write live. Headings stay plain
   * text (no inline parsing there); formulas live in the paragraphs as
   * $...$ and $$...$$.
   */
  document: {
    title: 'Imaginary numbers make a circle',
    blocks: [
      {
        type: 'text',
        text:
          'An imaginary number sounds like something that does not exist. It exists, ' +
          'and it does one specific job: it lets numbers turn. This page builds that ' +
          'up from nothing, and ends at a result you probably met in school without ' +
          'being told where it came from — the cosine and the sine.\n' +
          '\n' +
          'Every figure below is a live node of this flow, computing while you read. ' +
          'The pink numbers are inputs you can change: click one and type, or drag it ' +
          'sideways. The figures react immediately.',
      },
      { type: 'node', nodeId: 1000, float: 'right', width: '300px', caption: 'The formula this page is heading for' },

      { type: 'heading', text: 'Why the number line is not enough', level: 2 },
      {
        type: 'text',
        text:
          'Ordinary numbers — $1$, $2$, $-3$, $0.5$ — all sit on a line. Each one is a ' +
          'certain distance left or right of zero. Multiplying by a positive number ' +
          'slides you along that line; multiplying by $-1$ flips you to the other side ' +
          'of zero.\n' +
          '\n' +
          'Now ask a question no number on that line can answer: which number, ' +
          'multiplied by itself, gives $-1$? A positive times itself is positive. A ' +
          'negative times itself is also positive. Nothing on that line works.\n' +
          '\n' +
          'So define one. Call it $i$, and give it the property that was missing:\n' +
          '\n' +
          '$$i \\cdot i = -1$$\n' +
          '\n' +
          'You may have seen this written as $i = \\sqrt{-1}$. It comes to the same ' +
          'thing, but $i^2 = -1$ is the safer way to put it. Think of $\\sqrt{9}$: it ' +
          'means $3$ and not $-3$, even though both square to $9$ — the rule is to take ' +
          'the positive one. For $-1$ that rule has nothing to grab. Both $i$ and $-i$ ' +
          'square to $-1$, and neither of them is the positive one, so the square-root ' +
          'sign has no way to choose.\n' +
          '\n' +
          'Now watch what that one line does on its own. Start at $1$ and keep ' +
          'multiplying by $i$:\n' +
          '\n' +
          '$$1 \\to i \\to -1 \\to -i \\to 1$$\n' +
          '\n' +
          'Four multiplications, and you are exactly back where you started. Ordinary ' +
          'numbers never do that: keep multiplying by $2$ and you run away, by ' +
          '$\\tfrac12$ and you sink towards zero. Multiplying by $i$ does neither.\n' +
          '\n' +
          'Two of those four values sit on the line: $1$ and $-1$. The other two ' +
          'cannot, because nothing on the line squares to $-1$. So draw a second axis ' +
          'through zero, at right angles to the first, and plot $i$ on it one unit up — ' +
          '$-i$ lands one unit down.',
      },
      /*
       * The picture arrives the moment the second axis does, and the naming
       * that follows is read with it on screen — an explanation of axes lands
       * differently when the axes are already in front of you. Centred rather
       * than floated: a float this late in a section races the next section's
       * own figure for the right margin.
       */
      {
        type: 'node',
        nodeId: 1500,
        float: 'none',
        // The plane's normal view is 300px wide and the well pads it by 10 on
        // each side; anything wider leaves the drawing hanging to the left of
        // its own frame, since the mounted content does not stretch.
        width: '320px',
        caption: 'The four powers of i, walked one per step',
      },
      {
        type: 'text',
        text:
          'There they are. The horizontal axis carries the ordinary part of a number, ' +
          'called the **real** part; the vertical axis carries the **imaginary** part. ' +
          'Every number is $a + b\\,i$: $a$ along the real axis, $b$ along the ' +
          'imaginary one. That flat space is the complex plane, and it is what every ' +
          'figure on this page is drawn on — the axes marked `re` and `im`.\n' +
          '\n' +
          'The walk is live: the arm points at the value it is on, and it steps every ' +
          '{{1400:interval}} milliseconds — set that lower and it speeds up. Right, up, ' +
          'left, down: each multiplication by $i$ moves a quarter of the way round, and ' +
          'that is the shift this whole page rests on. Multiplication no longer only ' +
          'stretches. It stretches *and* turns.',
      },

      { type: 'heading', text: 'Turning without stopping', level: 2 },
      {
        type: 'node',
        nodeId: 1200,
        float: 'right',
        caption: 'A point going round, and the four quarter turns it passes through',
      },
      {
        type: 'text',
        text:
          'Four separate quarter turns give you four points, not a circle. A circle ' +
          'needs the turning to be continuous.\n' +
          '\n' +
          'Continuous change is what $e^x$ is for: it grows at a rate equal to its own ' +
          'current value, and that growth points in the direction it already has.\n' +
          '\n' +
          'Put $i$ in the exponent, and every bit of that growth gets rotated a quarter ' +
          'turn before it is applied — so it pushes sideways instead of outward. A ' +
          'sideways push cannot move you further from zero or closer to it. It can only ' +
          'change your direction. The distance from zero therefore stays $1$ forever, ' +
          'and all that is left is rotation:\n' +
          '\n' +
          '$$e^{i\\,x}$$\n' +
          '\n' +
          'The figure beside this text is that function, computed live: a dot travels ' +
          'the circle a small step at a time, while the four values from the last ' +
          'section stay marked on it — they sit exactly on this circle, and the arm ' +
          'still jumps between them a quarter at a time. That is the difference this ' +
          'section is about, in one picture. Note that $x$ ' +
          'is not measured in degrees: it is the distance travelled along the circle, ' +
          'and one full lap is $2\\pi \\approx 6.28$. That is why this run stops at ' +
          '{{1000:x.to}} — a little past one lap, so the circle closes.\n' +
          '\n' +
          'Set that number to $3$ and you see only the part of the circle actually ' +
          'travelled: an arc instead of a closed loop. Put it back to $6.3$ and it ' +
          'closes again.',
      },

      { type: 'heading', text: 'Cosine and sine are the two coordinates', level: 2 },
      { type: 'node', nodeId: 1300, float: 'left', caption: 'The same walk, seen from the side' },
      {
        type: 'text',
        text:
          'The moving point always has two coordinates: how far right it is, and how ' +
          'far up. Take each one on its own and plot it against $x$, the distance ' +
          'travelled. The horizontal coordinate moves out, back, and out again. The ' +
          'vertical one rises and falls. Both draw waves — and the point itself never ' +
          'wobbled; it only went round.\n' +
          '\n' +
          'Those two waves already have names. The horizontal coordinate is the ' +
          'cosine; the vertical coordinate is the sine:\n' +
          '\n' +
          '$$e^{i\\,x} = \\cos x + i\\,\\sin x$$\n' +
          '\n' +
          'This is Euler’s formula. It is not an extra fact to memorise — it is the ' +
          'same motion, written in coordinates. The circle above and the two waves ' +
          'beside this paragraph are produced by one node in the flow: a single set of ' +
          'numbers, drawn two ways.\n' +
          '\n' +
          'Now change the speed. The formula is really $e^{i\\,b\\,x}$, where $b$ is how ' +
          'fast the point goes round; at the moment $b =$ {{1000:params.b}}. Set it to ' +
          '$2$, but predict the result first. The circle does not change at all: same ' +
          'radius, same path, simply travelled twice over. The waves do change — twice ' +
          'as many cycles fit in the same width. Faster rotation means a shorter ' +
          'wavelength, which for a sound wave means a higher pitch.\n' +
          '\n' +
          'So the sine is not a fact about triangles that has to be looked up in a ' +
          'table. It is the vertical coordinate of a point going round a circle.',
      },

      { type: 'heading', text: 'Bonus: turning while shrinking', level: 2 },
      { type: 'node', nodeId: 900, float: 'right', caption: 'Turning and shrinking at once — a spiral' },
      {
        type: 'text',
        text:
          'One more knob, and it costs nothing new. The flow holds a second formula, ' +
          '$e^{(b\\,i - a)\\,x}$. The $b\\,i$ part turns, exactly as above. The $-a$ ' +
          'part shrinks the distance from the middle as $x$ grows. Turning while ' +
          'shrinking traces a spiral, drawn beside this text.\n' +
          '\n' +
          'How fast it shrinks is $a =$ {{400:params.a}}. Set it to $0$ and the ' +
          'shrinking stops — the spiral becomes the circle from the previous section. ' +
          'It was the same motion all along, with one extra effect switched on.',
      },

      { type: 'heading', text: 'Bonus: one rule, asked of every point', level: 2 },
      {
        type: 'text',
        text:
          'Everything above was one motion. This last part is one **rule**, repeated — ' +
          'and it needs nothing that has not already been said.\n' +
          '\n' +
          'Take a number $c$ somewhere in the plane. Start at zero, and keep applying ' +
          'the same step:\n' +
          '\n' +
          '$$z \\to z^2 + c$$\n' +
          '\n' +
          'Squaring is the part you already know: a quarter turn squared is a half ' +
          'turn, so squaring **doubles the angle**, and it squares the distance from ' +
          'zero. That second half matters more than it looks. Inside the circle of ' +
          'radius one, squaring pulls a point towards zero; outside it, squaring throws ' +
          'the point away, further every time. Adding $c$ then nudges it sideways.\n' +
          '\n' +
          'Between those two pulls, exactly one of two things happens. The walk settles ' +
          'down — into a point, or a loop it repeats forever — or it gets far enough out ' +
          'that squaring wins and it never comes back. There is no third case, and the ' +
          'dividing line is sharp: once the distance passes $2$, it is gone.',
      },
      {
        type: 'node',
        nodeId: 2000,
        float: 'left',
        width: '320px',
        caption: 'The walk for one c, step by step',
      },
      {
        type: 'text',
        text:
          'The figure beside this text is that walk, drawn on the same plane as ' +
          'everything else on this page. It starts at zero, and each dot is one ' +
          'application of the rule. For this $c$ it spirals inwards and stops moving — ' +
          'the walk has found a point that the rule sends back to itself.\n' +
          '\n' +
          'Now move $c$ and watch it break. It starts at $c =$ {{1900:c.re}} $+$ ' +
          '{{1900:c.im}}$\\,i$ — raise the first number to $0.4$ and the spiral stops ' +
          'being a spiral: three or four dots, each further out than the last, and the ' +
          'walk is gone. Put it back to $-0.5$ and it settles again.\n' +
          '\n' +
          'So each $c$ in the plane gets one of two answers, and there is nothing in ' +
          'between. Colour the plane by that answer — black where the walk stays, ' +
          'lighter the sooner it left — and you get this:',
      },
      {
        type: 'node',
        nodeId: 1800,
        float: 'none',
        width: '320px',
        caption: 'Black: every c whose walk stays. Press one to follow it.',
      },
      {
        type: 'text',
        text:
          'That is the Mandelbrot set, and it is worth being clear about what it is not. ' +
          'It is not a drawing of a formula, and nobody chose its shape. Every point of ' +
          'that black region is a $c$ whose walk stays put; every point outside is one ' +
          'whose walk ran away. The shape is the answer, not the question.\n' +
          '\n' +
          'The two figures are wired together: press a point in the picture and the walk ' +
          'beside it is that point\u2019s walk — the press takes over from the two ' +
          'numbers above, until you type one of them again. Press deep inside the black ' +
          'and the walk settles. Press well outside and it is gone in a few steps. Press ' +
          '*just* on the edge and it does neither for a long time — which is what the ' +
          'edge is.\n' +
          '\n' +
          'And that edge is where it stops being ordinary. Look closer at it and it does ' +
          'not smooth out, the way a circle does. There is always more of it, at every ' +
          'scale, and it never repeats and never settles down.',
      },
      {
        type: 'node',
        nodeId: 1700,
        float: 'right',
        caption: 'Places people gave names to',
        // A list of five names is not worth a screen of its own. Pinned, it
        // took the top from the picture it steers and then had nothing to
        // show there.
        pin: false,
      },
      {
        type: 'text',
        text:
          'The list beside this text is a few places worth going, and the picture above ' +
          'follows it — it is a node in the flow like everything else, and what it sends ' +
          'is where to look. Start at *the whole set*, then pick one.\n' +
          '\n' +
          '**Seahorse Valley** sits in the notch between the big shape and the circle to ' +
          'its left, magnified about five hundred times. **Elephant Valley** is the ' +
          'notch on the other side. Neither was designed; both are what the rule does ' +
          'there.\n' +
          '\n' +
          'The last entry is the one to end on. Eight hundred times smaller than the ' +
          'first picture, in a place with no particular claim to fame, the whole shape is ' +
          'there again — its own big body, its own circle beside it, its own valleys. ' +
          'Nothing put it there and nothing copied it. It is the same rule, and the same ' +
          'question, asked at a scale where the numbers differ in the fourth decimal.\n' +
          '\n' +
          'All of it from $z \\to z^2 + c$, which is one multiplication and one ' +
          'addition — and the multiplication is the quarter turn from the first section, ' +
          'done twice.',
      },

      {
        type: 'text',
        text:
          'In short: multiplying by $i$ is a quarter turn, turning needs a second ' +
          'dimension, and $e^{i\\,x}$ is what turning without stopping looks like. ' +
          'Cosine and sine are nothing more than the two coordinates of that motion.\n' +
          '\n' +
          'Every figure here is a node of one flow, and this page and that graph are ' +
          'two readings of the same JSON. {{!flow:Show me the flow}}',
      },
    ],
  },
  sockets: [],
  children: [
    {
      type: 'math-formula',
      title: 'Damped wave',
      id: 400,
      /*
       * The showpiece went COMPLEX: e^((b·i − a)·x). Its real and imaginary
       * parts are the damped cosine and sine the old demo showed — and on
       * the complex plane the same function is a logarithmic spiral walking
       * into the origin. One formula, three honest pictures.
       */
      config: {
        expr: 'e^((b*i - a)*x)',
        params: { a: 0.3, b: 4 },
        x: { from: 0, to: 8, step: 0.02 },
      },
      sockets: [{ id: 410, type: 'out', format: 'function' }],
      ui: { position: { x: 2, y: 4 } },
    },
    {
      type: 'math-derivative',
      title: 'Derivative',
      id: 500,
      sockets: [
        { id: 510, type: 'in', format: 'function' },
        { id: 511, type: 'out', format: 'function' },
      ],
      ui: { position: { x: 26, y: 4 } },
    },
    {
      type: 'math-sampler',
      title: 'Sampler',
      id: 600,
      config: { mode: 'sweep' },
      sockets: [
        { id: 610, type: 'in', format: 'function' },
        { id: 611, type: 'out', format: 'point' },
      ],
      ui: { position: { x: 2, y: 22 } },
    },
    {
      type: 'math-sampler',
      title: 'Sampler f′',
      id: 700,
      config: { mode: 'sweep' },
      sockets: [
        { id: 710, type: 'in', format: 'function' },
        { id: 711, type: 'out', format: 'point' },
      ],
      ui: { position: { x: 26, y: 22 } },
    },
    {
      type: 'graph-plot',
      title: 'Wave',
      id: 200,
      config: { style: 'line' },
      sockets: [{ id: 210, type: 'in', formats: ['number', 'point'] }],
      ui: { position: { x: 2, y: 42 } },
    },
    {
      type: 'graph-plot',
      title: 'Slope',
      id: 800,
      config: { style: 'line' },
      sockets: [{ id: 810, type: 'in', formats: ['number', 'point'] }],
      ui: { position: { x: 26, y: 42 } },
    },
    {
      type: 'graph-plane',
      title: 'Complex plane',
      id: 900,
      sockets: [{ id: 910, type: 'in', formats: ['number', 'point'] }],
      ui: { position: { x: 2, y: 64 } },
    },
    {
      type: 'math-formula',
      title: 'Unit circle',
      id: 1000,
      /*
       * The pure circle e^(i·b·x), starting at b = 1. The document needs a
       * picture of turning WITHOUT shrinking, and the showpiece cannot
       * provide it while its a stays nonzero — so a small separate chain
       * draws the circle permanently, and the spiral's "set a to 0" moment
       * gets a reference to relax into. Two of the document's three pills
       * write here, into x.to and into b, so this is the node the reader
       * actually plays with.
       */
      config: {
        expr: 'e^(i*b*x)',
        params: { b: 1 },
        // Just past 2π, so the circle closes.
        x: { from: 0, to: 6.3, step: 0.02 },
      },
      sockets: [{ id: 1010, type: 'out', format: 'function' }],
      ui: { position: { x: 50, y: 4 } },
    },
    {
      type: 'math-sampler',
      title: 'Sampler circle',
      id: 1100,
      config: { mode: 'sweep' },
      sockets: [
        { id: 1110, type: 'in', format: 'function' },
        { id: 1111, type: 'out', format: 'point' },
      ],
      ui: { position: { x: 50, y: 22 } },
    },
    {
      type: 'graph-plane',
      title: 'Unit circle',
      id: 1200,
      /*
       * Two inputs, so two layers: the circle underneath, and the four powers
       * of i marked on top of it. Socket order IS drawing order — the marks
       * are declared second because they must cover the curve, not hide under
       * it. They also happen to prove the section's point: those four values
       * sit exactly on this circle.
       */
      sockets: [
        { id: 1210, type: 'in', formats: ['number', 'point', 'marks'] },
        { id: 1211, type: 'in', formats: ['number', 'point', 'marks'] },
        { id: 1212, type: 'in', formats: ['number', 'point', 'marks'] },
      ],
      ui: { position: { x: 50, y: 42 } },
    },
    {
      type: 'math-points',
      title: 'The four powers of i',
      id: 1400,
      /*
       * The four values the reader has just worked out by hand, written down
       * as data: each one carries the name it goes by, because a dot at
       * (0, 1) means little and a dot labelled i means everything. The walk
       * runs on its own clock, which the document hands to the reader.
       */
      config: {
        points: [
          { re: 1, im: 0, label: '1' },
          { re: 0, im: 1, label: 'i' },
          { re: -1, im: 0, label: '−1' },
          { re: 0, im: -1, label: '−i' },
        ],
        interval: 900,
      },
      sockets: [{ id: 1410, type: 'out', format: 'marks' }],
      // Near the plane it feeds, not across the canvas from it: this node's
      // marks go to two plots, and from the far corner one of those wires
      // crossed every other node on the way.
      ui: { position: { x: 76, y: 4 } },
    },
    {
      type: 'graph-plane',
      title: 'Four powers of i',
      id: 1500,
      sockets: [{ id: 1510, type: 'in', formats: ['number', 'point', 'marks'] }],
      ui: { position: { x: 76, y: 22 } },
    },
    {
      type: 'math-sampler',
      title: 'Walker',
      id: 1600,
      /*
       * The same circle, stepped instead of swept: one small step per tick,
       * so the plane draws a dot travelling the curve its neighbour drew all
       * at once. The step is the sampler's own — hence `touched`, or the
       * formula's declared step would take it back on the next emit — and it
       * is coarser than the sweep's, because a lap you can watch beats a lap
       * that is smooth and takes a minute.
       */
      config: {
        mode: 'point',
        step: 0.05,
        interval: 40,
        touched: { step: true },
      },
      sockets: [
        { id: 1610, type: 'in', format: 'function' },
        { id: 1611, type: 'out', format: 'point' },
      ],
      ui: { position: { x: 64, y: 22 } },
    },
    {
      type: 'graph-plot',
      title: 'Shadows',
      id: 1300,
      /*
       * The circle's two coordinates, plotted against x. It hangs off the
       * SAME sampler as the unit circle above it, which is the document's
       * whole payoff made mechanical: one run of samples, drawn as a path on
       * the plane and as re and im against x. A time series plots both parts
       * with a legend, so cosine and sine arrive together without a second
       * chain.
       */
      config: { style: 'line' },
      sockets: [{ id: 1310, type: 'in', formats: ['number', 'point'] }],
      // Clear of the plot above it, LABEL included: 14% of the canvas left this
      // box sitting on the unit circle's caption in the flow view.
      ui: { position: { x: 50, y: 64 } },
    },

    /*
     * The bonus chain, in its own row beneath the rest: a list of places, the
     * picture of the set, one point's orbit, and a plane to draw that orbit
     * on. It shares no node with the chains above — the sections before it
     * are about one motion, and this one is about repeating a rule — but it
     * is drawn on the same plane, which is the whole reason it belongs here.
     */
    {
      type: 'graph-viewpoints',
      title: 'Where to look',
      id: 1700,
      config: { which: 0 },
      sockets: [{ id: 1710, type: 'out', format: 'region' }],
      ui: { position: { x: 2, y: 86 } },
    },
    {
      type: 'math-mandelbrot',
      title: 'Asking every point',
      id: 1750,
      /*
       * The whole set to start with: the picture everyone has seen, before
       * anybody goes looking inside it.
       */
      config: { view: { re: -0.6, im: 0, span: 3.2 }, iterations: 200, resolution: 400 },
      sockets: [
        { id: 1810, type: 'in', formats: ['region'] },
        { id: 1751, type: 'out', format: 'field' },
      ],
      ui: { position: { x: 12, y: 84 } },
    },
    {
      type: 'graph-field',
      title: 'The Mandelbrot set',
      id: 1800,
      /*
       * Log, and it matters: almost every point outside the set leaves in
       * under ten steps, so spreading the colours evenly paints nine tenths
       * of the picture one shade and hides the boundary — which is the only
       * part worth looking at.
       */
      config: { scale: 'log' },
      sockets: [
        { id: 1812, type: 'in', formats: ['field'] },
        { id: 1811, type: 'out', format: 'complex' },
      ],
      ui: { position: { x: 26, y: 84 } },
    },
    {
      type: 'math-iterate',
      title: 'z² + c',
      id: 1900,
      /*
       * A c inside the set, and visibly so — the orbit spirals into a fixed
       * point rather than sitting on one. Pressing the picture replaces it.
       */
      config: { c: { re: -0.5, im: 0.5 }, steps: 40, escape: 2, interval: 220 },
      sockets: [
        { id: 1910, type: 'in', formats: ['complex'] },
        { id: 1911, type: 'out', format: 'marks' },
      ],
      ui: { position: { x: 44, y: 86 } },
    },
    {
      type: 'graph-plane',
      title: 'The orbit',
      id: 2000,
      sockets: [{ id: 2010, type: 'in', formats: ['number', 'point', 'marks'] }],
      ui: { position: { x: 60, y: 84 } },
    },
  ],
  /*
   * Two sampled chains side by side — the wave and its slope — the same
   * function once more as a path through the complex plane, and a second,
   * minimal chain for the circle e^(i·b·x). That circle's sampler fans out
   * to two plots, because the document argues that the circle and the pair
   * of waves are one motion; sharing the sampler is that argument in the
   * wiring, not just in the prose. The samplers run in sweep mode, so every
   * picture stands complete the moment the page opens.
   */
  connections: [
    { id: 1002, from: 400, to: 500, out: 410, in: 510 },
    { id: 1003, from: 400, to: 600, out: 410, in: 610 },
    { id: 1004, from: 500, to: 700, out: 511, in: 710 },
    { id: 1005, from: 600, to: 200, out: 611, in: 210 },
    { id: 1007, from: 600, to: 900, out: 611, in: 910 },
    { id: 1006, from: 700, to: 800, out: 711, in: 810 },
    { id: 1008, from: 1000, to: 1100, out: 1010, in: 1110 },
    { id: 1009, from: 1100, to: 1200, out: 1111, in: 1210 },
    { id: 1011, from: 1100, to: 1300, out: 1111, in: 1310 },
    { id: 1012, from: 1400, to: 1500, out: 1410, in: 1510 },
    { id: 1013, from: 1400, to: 1200, out: 1410, in: 1211 },
    { id: 1014, from: 1000, to: 1600, out: 1010, in: 1610 },
    { id: 1015, from: 1600, to: 1200, out: 1611, in: 1212 },

    // The bonus: where to look, what it looks like, and what one point does.
    { id: 1016, from: 1700, to: 1750, out: 1710, in: 1810 },
    { id: 1020, from: 1750, to: 1800, out: 1751, in: 1812 },
    { id: 1017, from: 1800, to: 1900, out: 1811, in: 1910 },
    { id: 1018, from: 1900, to: 2000, out: 1911, in: 2010 },
  ],
});

/**
 * The flow we are exploring the TOPAS data with.
 *
 * Seeded beside the demo under its own id, so it is on the shelf in every
 * browser and reproducible from git rather than from whatever somebody's
 * localStorage happens to hold.
 *
 * Three nodes, one job each: ask, take the part we meant, draw it. The first
 * two used to be one node, which was quicker to build and worse to look at —
 * the seam between fetching and interpreting is exactly the thing worth
 * seeing on a canvas, because everything downstream depends on getting the
 * interpretation right.
 *
 * The URL is RELATIVE, and that is not a detail: a browser blocks a
 * cross-origin fetch unless the far end allows it, and this data allows
 * nothing — but the two apps live under one domain, so from /fbp/ the path
 * ../tno-topas/lml.json is same-origin. Run the editor from a dev server and
 * the request reports that it could not fetch, which is the honest answer
 * rather than a silent empty map.
 *
 * A function, because ids must be fresh per creation.
 */
/**
 * The two measuring networks TOPAS publishes, on one map.
 *
 * The official network and the citizen sensors drawn beside each other — 93
 * instruments against three thousand, which is a fact about the data worth
 * seeing rather than reading.
 *
 * This case used to be two flows, one asking "where is it measured
 * officially" and this one asking what the two look like together. The first
 * was the second minus a chain, which is a second copy to keep in step rather
 * than a second question.
 *
 * Two chains into ONE map, on two input sockets, so the layer order is the
 * node's socket order: the sparse official network sits on top of the dense
 * citizen one and stays findable.
 *
 * Only the official stations carry labels. The citizen sensors have no names
 * in the file at all, and three thousand tooltips would be a wall of text
 * where a map should be — so their `limit` is the interesting knob instead.
 *
 * A function, because ids must be fresh per creation.
 */

/* ------------------------------------------------------------------------
   The TOPAS sources subflow
   ------------------------------------------------------------------------
   Fifteen fetches and their plumbing, written as a function rather than as
   four hundred lines of literal. What matters about this flow is its SHAPE —
   config in, seven typed things out — and a shape is easier to check in code
   that names its parts than in a wall of ids.

   Ids are handed out from one counter so they cannot collide, and the layout
   is columns: what was asked for, what was read out of it, what was built
   from that, what was fetched, and what shape it came back as.
 */

/*
 * Well clear of the subflow's own ids: it is 2000 and its out sockets are
 * 2001–2007. The first version started here at 2000, so the first node inside
 * took 2001 — the same number as the EU grid socket — and two of the switch's
 * inputs quietly resolved against the wrong socket. Ids are a namespace; this
 * counter has its own end of it.
 */
let sourceId = 2100;

const nextId = () => (sourceId += 1);

/** A request that fetches whatever arrives on its `url` socket. */
function fetches(title: string, position: { x: number; y: number }, url = '') {
  const id = nextId();

  return {
    node: {
      type: 'net-request',
      title,
      id,
      config: { url, method: 'GET', every: 0, title },
      sockets: [
        { id: nextId(), type: 'in', name: 'when' },
        { id: nextId(), type: 'in', name: 'url', format: 'string' },
        { id: nextId(), type: 'out', format: 'data' },
      ],
      ui: { position },
    },
    id,
    get in() { return this.node.sockets[1].id!; },
    get out() { return this.node.sockets[2].id!; },
  };
}

/** A value taken out of whatever arrived, as text. */
function reads(title: string, path: string, position: { x: number; y: number }) {
  const id = nextId();

  return {
    node: {
      type: 'data-pick',
      title,
      id,
      config: { shape: 'text', a: path },
      sockets: [
        { id: nextId(), type: 'in', format: 'data' },
        { id: nextId(), type: 'out', format: 'string' },
      ],
      ui: { position },
    },
    id,
    get in() { return this.node.sockets[0].id!; },
    get out() { return this.node.sockets[1].id!; },
  };
}

/** A string built from a pattern; the named sockets are its placeholders. */
function builds(title: string, names: string[], position: { x: number; y: number }, pattern = '') {
  const id = nextId();
  const node = {
    type: 'data-template',
    title,
    id,
    config: { pattern },
    sockets: [
      // The out socket carries a `name` too, unused, so the array has one type
      // and `socket(name)` can search it without narrowing gymnastics.
      ...names.map(name => ({ id: nextId(), type: 'in', name, format: undefined as string | undefined })),
      { id: nextId(), type: 'out', name: 'built', format: 'string' as string | undefined },
    ],
    ui: { position },
  };

  return {
    node,
    id,
    socket: (name: string) => node.sockets.find(s => s.name === name)!.id!,
    get out() { return node.sockets[node.sockets.length - 1].id!; },
  };
}

/** What a fetched file turns into: a raster, or a set of places. */
function shapes(title: string, config: Record<string, unknown>, format: string, position: { x: number; y: number }) {
  const id = nextId();

  return {
    node: {
      type: 'data-pick',
      title,
      id,
      config,
      sockets: [
        { id: nextId(), type: 'in', format: 'data' },
        { id: nextId(), type: 'out', format },
      ],
      ui: { position },
    },
    id,
    get in() { return this.node.sockets[0].id!; },
    get out() { return this.node.sockets[1].id!; },
  };
}

/**
 * Everything TOPAS publishes, behind one node with seven outputs.
 *
 * The subflow is not decoration. Fifteen nodes of fetching and string-building
 * is the machinery, and machinery on the same canvas as the picture drowns the
 * picture — while the seven sockets on the outside say exactly what this place
 * can give you and nothing about how.
 *
 * Every URL in here is worked out from the publisher's own config: the path
 * patterns, the date, the region ids and the network file names all come out
 * of config.json. Nothing is typed but the address of that one file.
 */
function topasSources() {
  // What the publisher says about itself.
  const gridPathNl = reads('NL grid path', 'regions.0.gridPath', { x: 14, y: 4 });
  const gridPathEu = reads('EU grid path', 'regions.1.gridPath', { x: 14, y: 16 });
  const date = reads('date', 'currentDate', { x: 14, y: 28 });
  const idNl = reads('NL', 'regions.0.id', { x: 14, y: 40 });
  const idEu = reads('EU', 'regions.1.id', { x: 14, y: 52 });

  const lmlPath = reads('LML file', 'networks.0.path', { x: 14, y: 62 });
  const samenPath = reads('Samen Meten file', 'networks.1.path', { x: 14, y: 72 });
  const eeaPath = reads('EEA file', 'networks.2.path', { x: 14, y: 82 });

  // What that makes: a file name, then a whole URL.
  const gridFileNl = builds('NL grid file', ['pattern', 'region|lower', 'date', 'pollutant'], { x: 30, y: 4 });
  const gridFileEu = builds('EU grid file', ['pattern', 'region|lower', 'date', 'pollutant'], { x: 30, y: 20 });
  const eeaFile = builds('EEA file name', ['pattern', 'region|lower'], { x: 30, y: 72 });

  const base = '../tno-topas/{path}';
  const urlGridNl = builds('NL grid URL', ['path'], { x: 46, y: 4 }, base);
  const urlGridEu = builds('EU grid URL', ['path'], { x: 46, y: 20 }, base);
  const urlLml = builds('LML URL', ['path'], { x: 46, y: 40 }, base);
  const urlSamen = builds('Samen Meten URL', ['path'], { x: 46, y: 60 }, base);
  const urlEea = builds('EEA URL', ['path'], { x: 46, y: 78 }, base);

  // What is fetched, and what it turns into.
  const getGridNl = fetches('NL grid', { x: 62, y: 4 });
  const getGridEu = fetches('EU grid', { x: 62, y: 20 });
  const getLml = fetches('RIVM LML', { x: 62, y: 40 });
  const getSamen = fetches('Samen Meten', { x: 62, y: 60 });
  const getEea = fetches('EEA', { x: 62, y: 78 });

  const rasterNl = shapes('NL raster', { shape: 'grid' }, 'grid', { x: 78, y: 4 });
  const rasterEu = shapes('EU raster', { shape: 'grid' }, 'grid', { x: 78, y: 20 });

  const flowId = 2000;
  const out = {
    gridNl: 2001, gridEu: 2002, lml: 2003, samen: 2004, eea: 2005, config: 2006, date: 2007,
  };

  /*
   * The two things this place needs from outside.
   *
   * The config used to be fetched in here, and the pollutant was whichever
   * one the config happened to list first — so the one decision a reader
   * actually makes was buried fifteen nodes deep. Both are inputs now: the
   * subflow is the machinery, and what to point it at belongs where it can
   * be seen.
   */
  const inn = { config: 2010, pollutant: 2011 };

  /** Reading the config, which now arrives on a socket rather than a fetch. */
  const fromConfig = (to: { id: number }, socket: number) =>
    ({ id: nextId(), from: flowId, to: to.id, out: inn.config, in: socket });

  const wire = (from: { id: number }, out_: number, to: { id: number }, in_: number) =>
    ({ id: nextId(), from: from.id, to: to.id, out: out_, in: in_ });

  // Into the subflow's own out sockets: `to` is the subflow itself.
  const emit = (from: { id: number }, out_: number, socket: number) =>
    ({ id: nextId(), from: from.id, to: flowId, out: out_, in: socket });

  return {
    type: 'flow',
    title: 'TOPAS sources',
    id: flowId,
    config: {},
    ui: { position: { x: 4, y: 30 } },
    sockets: [
      { id: inn.config, type: 'in', name: 'config', format: 'data' },
      { id: inn.pollutant, type: 'in', name: 'pollutant', format: 'string' },
      { id: out.gridNl, type: 'out', name: 'NL grid', format: 'grid' },
      { id: out.gridEu, type: 'out', name: 'EU grid', format: 'grid' },
      /*
       * The networks' own files, unread.
       *
       * They used to leave here shaped into places, which was one step too
       * eager: a file says where its stations ARE and also where a station's
       * own readings live, what the network calls itself, and what this
       * publisher calls a measurement. Shaping it here threw four of those
       * away and left the flow outside guessing — which is how every citizen
       * sensor ended up being asked for under the official network's name.
       */
      { id: out.lml, type: 'out', name: 'NL · RIVM LML', format: 'data' },
      { id: out.samen, type: 'out', name: 'NL · Samen Meten', format: 'data' },
      { id: out.eea, type: 'out', name: 'EU · EEA', format: 'data' },
      { id: out.config, type: 'out', name: 'config', format: 'data' },
      { id: out.date, type: 'out', name: 'date', format: 'string' },

    ],
    children: [
      gridPathNl.node, gridPathEu.node, date.node, idNl.node, idEu.node,
      lmlPath.node, samenPath.node, eeaPath.node,
      gridFileNl.node, gridFileEu.node, eeaFile.node,
      urlGridNl.node, urlGridEu.node, urlLml.node, urlSamen.node, urlEea.node,
      getGridNl.node, getGridEu.node, getLml.node, getSamen.node, getEea.node,
      rasterNl.node, rasterEu.node,
    ],
    connections: [
      // One file, read eight ways — and it arrives on a socket.
      ...[gridPathNl, gridPathEu, date, idNl, idEu, lmlPath, samenPath, eeaPath]
        .map(pick => fromConfig(pick, pick.in)),

      // The grid file names.
      wire(gridPathNl, gridPathNl.out, gridFileNl, gridFileNl.socket('pattern')),
      wire(idNl, idNl.out, gridFileNl, gridFileNl.socket('region|lower')),
      wire(date, date.out, gridFileNl, gridFileNl.socket('date')),
      { id: nextId(), from: flowId, to: gridFileNl.id, out: inn.pollutant, in: gridFileNl.socket('pollutant') },

      wire(gridPathEu, gridPathEu.out, gridFileEu, gridFileEu.socket('pattern')),
      wire(idEu, idEu.out, gridFileEu, gridFileEu.socket('region|lower')),
      wire(date, date.out, gridFileEu, gridFileEu.socket('date')),
      { id: nextId(), from: flowId, to: gridFileEu.id, out: inn.pollutant, in: gridFileEu.socket('pollutant') },

      // The EEA file name is itself a pattern: `{region}-eea.json`.
      wire(eeaPath, eeaPath.out, eeaFile, eeaFile.socket('pattern')),
      wire(idEu, idEu.out, eeaFile, eeaFile.socket('region|lower')),

      // A published path is relative to the publisher, not to us.
      wire(gridFileNl, gridFileNl.out, urlGridNl, urlGridNl.socket('path')),
      wire(gridFileEu, gridFileEu.out, urlGridEu, urlGridEu.socket('path')),
      wire(lmlPath, lmlPath.out, urlLml, urlLml.socket('path')),
      wire(samenPath, samenPath.out, urlSamen, urlSamen.socket('path')),
      wire(eeaFile, eeaFile.out, urlEea, urlEea.socket('path')),

      // Fetch, then shape.
      wire(urlGridNl, urlGridNl.out, getGridNl, getGridNl.in),
      wire(urlGridEu, urlGridEu.out, getGridEu, getGridEu.in),
      wire(urlLml, urlLml.out, getLml, getLml.in),
      wire(urlSamen, urlSamen.out, getSamen, getSamen.in),
      wire(urlEea, urlEea.out, getEea, getEea.in),

      wire(getGridNl, getGridNl.out, rasterNl, rasterNl.in),
      wire(getGridEu, getGridEu.out, rasterEu, rasterEu.in),

      // And out, where the rest of the flow can see them.
      emit(rasterNl, rasterNl.out, out.gridNl),
      emit(rasterEu, rasterEu.out, out.gridEu),
      emit(getLml, getLml.out, out.lml),
      emit(getSamen, getSamen.out, out.samen),
      emit(getEea, getEea.out, out.eea),
      { id: nextId(), from: flowId, to: flowId, out: inn.config, in: out.config },
      emit(date, date.out, out.date),
    ],
  };
}

/**
 * One station's readings, from a press to a picture.
 *
 * A subflow of its own, because it is one thought: take the code out of what
 * was pressed, work out where that station's file lives, fetch it, and turn
 * what comes back into something a plot can drink. Four steps, none of which
 * mean anything alone, and all of which are somebody else's business the
 * moment you are reading the graph rather than building it.
 *
 * It wears the request on the outside — `config.preview` — so the box in the
 * article is the fetch your own click made, rather than a picture of five
 * nodes. The machinery is one double-click away for anyone who wants it.
 *
 * Everything it needs arrives on a socket: the pressed place, the publisher's
 * config, the NETWORK's own file (which is where a series path lives, not the
 * config), and which pollutant to ask for. Nothing is typed in here but the
 * shape of the answer.
 *
 * `typePath` is which breakdown to ask for, and it is a PATH into the network
 * file rather than a word: every network publishes `series.types`, and what
 * that maps to — `sectoren`, `countries` — is the publisher's spelling, not
 * ours. Two instances pointed at two of those keys are two questions about
 * the same click, which is the only difference between them.
 */
function stationReadings(
  flowId: number,
  regionPath: string,
  position: { x: number; y: number },
  typePath = 'series.types.sectors',
  top = 0,
) {
  const inn = { place: flowId + 10, network: flowId + 11, config: flowId + 12, pollutant: flowId + 13 };
  const out = { readings: flowId + 1 };

  const code = shapes('station code', { shape: 'text', a: 'places.0.ref' }, 'string', { x: 10, y: 8 });

  /*
   * Three fields out of the network's own file, and one out of the config.
   *
   * The network id is read from the FILE rather than typed, which is the
   * whole reason the file travels whole: press a citizen sensor and the
   * address says `samenmeten`, press an official station and it says `lml`,
   * and neither the map nor this subflow had to be told which is showing.
   * `metingen` is in there for the same kind of reason — so that nobody has
   * to know this publisher is Dutch.
   */
  const seriesPath = reads('series path', 'series.path', { x: 10, y: 28 });
  const networkId = reads('network id', 'network', { x: 10, y: 40 });
  const seriesType = reads('breakdown', typePath, { x: 10, y: 52 });
  const regionId = reads('region', regionPath, { x: 10, y: 66 });

  const file = builds(
    'series file',
    ['pattern', 'region|lower', 'network', 'code', 'pollutant', 'type'],
    { x: 38, y: 40 },
  );
  const url = builds('series URL', ['path'], { x: 56, y: 40 }, '../tno-topas/{path}');

  const get = fetches('That station’s readings', { x: 70, y: 42 });
  const points = shapes(
    'breakdown',
    /*
     * The European files split every sector again by whether it came from the
     * country itself, which is thirty-six labels for eighteen sources and a
     * legend nobody can read. The pattern is here rather than in the module:
     * `native` is this publisher's word.
     */
    {
      shape: 'stack', labels: 'labels', values: 'values', title: 'name',
      merge: '^(.*?) (?:non-)?native$',
      // Only where the file names every possible contributor rather than the
      // ones that contributed — see the European country breakdown.
      ...(top ? { top } : {}),
    },
    'stack',
    { x: 86, y: 48 },
  );

  const wire = (from: { id: number }, out_: number, to: { id: number }, in_: number) =>
    ({ id: nextId(), from: from.id, to: to.id, out: out_, in: in_ });
  const fromOutside = (socket: number, to: { id: number }, in_: number) =>
    ({ id: nextId(), from: flowId, to: to.id, out: socket, in: in_ });

  return {
    type: 'flow',
    title: 'Station readings',
    id: flowId,
    // The face it wears: the request, which is the part worth watching.
    config: { preview: get.id },
    ui: { position },
    sockets: [
      { id: inn.place, type: 'in', name: 'pressed place', format: 'geo' },
      { id: inn.network, type: 'in', name: 'network file', format: 'data' },
      { id: inn.config, type: 'in', name: 'config', format: 'data' },
      { id: inn.pollutant, type: 'in', name: 'pollutant', format: 'string' },
      { id: out.readings, type: 'out', name: 'breakdown', format: 'stack' },
    ],
    children: [
      code.node, seriesPath.node, networkId.node, seriesType.node, regionId.node,
      file.node, url.node, get.node, points.node,
    ],
    connections: [
      fromOutside(inn.place, code, code.in),
      fromOutside(inn.network, seriesPath, seriesPath.in),
      fromOutside(inn.network, networkId, networkId.in),
      fromOutside(inn.network, seriesType, seriesType.in),
      fromOutside(inn.config, regionId, regionId.in),

      // Six parts, six sources, and not one of them typed here.
      wire(seriesPath, seriesPath.out, file, file.socket('pattern')),
      wire(regionId, regionId.out, file, file.socket('region|lower')),
      wire(networkId, networkId.out, file, file.socket('network')),
      wire(seriesType, seriesType.out, file, file.socket('type')),
      wire(code, code.out, file, file.socket('code')),
      fromOutside(inn.pollutant, file, file.socket('pollutant')),

      wire(file, file.out, url, url.socket('path')),
      wire(url, url.out, get, get.in),
      wire(get, get.out, points, points.in),
      { id: nextId(), from: points.id, to: flowId, out: points.out, in: out.readings },
    ],
  };
}

/**
 * The stations worth putting on a map, out of everything a network publishes.
 *
 * Three nodes that mean nothing apart and one thing together: keep the
 * stations that measure what is being asked about, drop the ones the model has
 * nothing to say about, and turn what is left into places. Six of them stood
 * in the main view — two per map, twice over — and a reader looking for the
 * argument had to step around the plumbing to find it.
 *
 * It wears the last step, so the box says what it produced: `geo`, and how
 * many. That number is the interesting one, because it changes with the
 * pollutant — 70 stations for PM2.5, 17 for SO2 — and a reader who notices the
 * map thinning out has understood something true about the data.
 */
function stationsToDraw(flowId: number, position: { x: number; y: number }) {
  const inn = { file: flowId + 10, pollutant: flowId + 11 };
  const out = { places: flowId + 1 };

  const measures = {
    type: 'data-filter',
    title: 'measures it',
    id: nextId(),
    config: { list: 'list', path: 'pollutants', test: 'has', value: '' },
    sockets: [
      { id: nextId(), type: 'in', formats: ['data'] },
      { id: nextId(), type: 'in', name: 'value', format: 'string' },
      { id: nextId(), type: 'out', format: 'data' },
    ],
    ui: { position: { x: 10, y: 22 } },
  };

  const modelled = {
    type: 'data-filter',
    title: 'and is modelled',
    id: nextId(),
    config: { list: '', path: 'geenModel', test: 'has', value: '', negate: true },
    sockets: [
      { id: nextId(), type: 'in', formats: ['data'] },
      { id: nextId(), type: 'in', name: 'value', format: 'string' },
      { id: nextId(), type: 'out', format: 'data' },
    ],
    ui: { position: { x: 38, y: 38 } },
  };

  const places = {
    type: 'data-pick',
    title: 'stations',
    id: nextId(),
    config: { shape: 'geo', list: '', a: 'lat', b: 'lon', label: '', ref: 'code', limit: 400 },
    sockets: [
      { id: nextId(), type: 'in', formats: ['data'] },
      { id: nextId(), type: 'out', format: 'geo' },
    ],
    ui: { position: { x: 68, y: 46 } },
  };

  return {
    type: 'flow',
    title: 'Stations worth drawing',
    id: flowId,
    config: { preview: places.id },
    ui: { position },
    sockets: [
      { id: inn.file, type: 'in', name: 'network file', format: 'data' },
      { id: inn.pollutant, type: 'in', name: 'pollutant', format: 'string' },
      { id: out.places, type: 'out', name: 'stations', format: 'geo' },
    ],
    children: [measures, modelled, places],
    connections: [
      { id: nextId(), from: flowId, to: measures.id, out: inn.file, in: measures.sockets[0].id },
      { id: nextId(), from: flowId, to: measures.id, out: inn.pollutant, in: measures.sockets[1].id },
      { id: nextId(), from: measures.id, to: modelled.id, out: measures.sockets[2].id, in: modelled.sockets[0].id },
      { id: nextId(), from: flowId, to: modelled.id, out: inn.pollutant, in: modelled.sockets[1].id },
      { id: nextId(), from: modelled.id, to: places.id, out: modelled.sockets[2].id, in: places.sockets[0].id },
      { id: nextId(), from: places.id, to: flowId, out: places.sockets[1].id, in: out.places },
    ],
  };
}

export const tno = () => ({
  id: 1,
  type: 'flow',
  title: 'tno',
  config: { seedVersion: 37 },
  /*
   * The same flow, read as an article.
   *
   * The demo teaches a piece of mathematics; this one reports on somebody
   * else's data, which is a different job and a different voice: every number
   * in it is either in the files this flow fetches or in a paper that is cited
   * for it. Nothing is rounded up for effect, and where the published figure
   * and the fetched file disagree the FILE is quoted, because the file is what
   * the reader is looking at.
   *
   * Short on purpose. It is an article about a flow, not a review paper, and
   * its argument is one sentence long: the map does not say how dirty the air
   * is, it says whose air it is.
   */
  document: {
    title: 'Air pollutants decomposed',
    blocks: [
      {
        type: 'text',
        text:
          'A measuring station tells you how much of something is in the air. It cannot ' +
          'tell you whose it is — from which country, from which sector. No instrument ' +
          'can separate a microgram from a ship from a microgram from a farm, because by ' +
          'the time it arrives they are the same dust.\n' +
          '\n' +
          'A model can, and that is the whole addition made here. TNO runs ' +
          '[LOTOS-EUROS](https://airqualitymodeling.tno.nl/lotos-euros/) daily over ' +
          'Europe, and in this version every emission is *labelled* where it leaves the ' +
          'ground — this country, that sector — and the label is carried with the mass ' +
          'through transport, chemistry and deposition. The labels are fractions of the ' +
          'concentration and they are made to add up to one, so every microgram in a ' +
          'cell belongs to somebody. One run answers it for all sources at once; the ' +
          'older way — switch a sector off, run again, take the difference — changes the ' +
          'chemistry while it is at it, and so answers a slightly different question ' +
          '([Kranenburg et al., 2013](https://gmd.copernicus.org/articles/6/721/2013/); ' +
          '[TOPAS](https://airqualitymodeling.tno.nl/topas/topas-documentation/)).\n' +
          '\n' +
          'The model is a box, and air crosses its edges. What blows in over the ' +
          'boundary — and what was already in the air when the run began — is not worked ' +
          'out here: it is taken from a global model and given a label of its own ' +
          '([CAMS](https://atmosphere.copernicus.eu/sites/default/files/2023-06/LOTOS-EUROS%20Fact%20sheet.pdf)). ' +
          'So one of the shares you can read off is *from outside*, and that one is ' +
          'assumed rather than computed. It has to be: without it the fractions would ' +
          'not add up, and the pollution that genuinely came from elsewhere would be ' +
          'handed to whoever is nearest.\n' +
          '\n' +
          'Every figure below is a live node of this flow. Start by choosing what to ' +
          'ask about: these are the pollutants the publisher offers, read from its own ' +
          'config rather than typed here.',
      },
      { type: 'node', nodeId: 630, float: 'none', caption: 'What there is to ask about' },

      { type: 'heading', text: 'The Netherlands', level: 2 },
      {
        type: 'text',
        text:
          'Two networks measure it here, and they could not be more different. The ' +
          'official one, RIVM’s Luchtmeetnet, contributes 93 reference stations — known ' +
          'instruments on known sites, as close to the truth as measuring gets. The ' +
          'citizen network, [Samen Meten](https://www.rivm.nl/lucht/meten-modelleren-berekenen/samen-meten), ' +
          'contributes 3,166 small sensors on balconies and fences.\n' +
          '\n' +
          'One sensor is worse than one station at almost everything; three thousand are ' +
          'better than 93 at the one thing a map needs, which is being somewhere. ' +
          'Precision and coverage are different virtues.',
      },
      { type: 'node', nodeId: 500, float: 'right', caption: 'One network at a time' },
      {
        type: 'text',
        text:
          'The map underneath the stations is the model: a value per cell, about 1.4 by ' +
          '1.7 km, for the day the publisher last computed. The markers are the network ' +
          'you chose — and only the stations that can answer, because a station without ' +
          'an instrument for this pollutant, or one the model does not label, is a dot ' +
          'you could press for nothing.',
      },
      { type: 'node', nodeId: 300, float: 'none', width: '440px', caption: 'The model underneath, the measurements on top' },
      {
        type: 'text',
        text:
          'Press one. That station comes back taken apart twice — by sector and by ' +
          'country, what was done and where it was done. Same bar, same day, cut two ' +
          'ways: one bar per day, its height the total, each band a share of it. ' +
          '`Boundary` is what blew in over the edge of the model; `Seasalt` and ' +
          '`Saharan Dust` are nobody’s to reduce; the rest is a list of decisions ' +
          'somebody could make.',
      },
      // Back to back, deliberately. The two cuts of one bar are read against
      // each other, and a paragraph between them is a paragraph you have to
      // scroll past to make the comparison the page is about.
      { type: 'node', nodeId: 1100, float: 'none', width: '440px', caption: 'One station, by sector' },
      { type: 'node', nodeId: 1300, float: 'none', width: '440px', caption: 'The same station, by country' },

      { type: 'heading', text: 'Europe', level: 2 },
      {
        type: 'text',
        text:
          'The same model, the same labels, one zoom level out: cells of roughly 22 by ' +
          '28 km from 30°N to 71°N, and the EEA’s network on top of them. Neither ' +
          'picture is more true than the other — a cell is an average, and an average ' +
          'over 1.4 km is still an average over a motorway, a park and the house you ' +
          'live in.\n' +
          '\n' +
          'It is a second map rather than a second layer because a view fitted to both ' +
          'is a view fitted to Europe, in which the Netherlands is forty pixels across.',
      },
      { type: 'node', nodeId: 700, float: 'none', width: '440px', caption: 'The same day over Europe' },
      { type: 'node', nodeId: 1200, float: 'none', width: '440px', caption: 'A European station, by sector' },
      { type: 'node', nodeId: 1400, float: 'none', width: '440px', caption: 'The same station, by country' },

      {
        type: 'text',
        text:
          'Add the labels up over the Netherlands and roughly a third of the particulate ' +
          'matter people put there is Dutch; two thirds crossed a border ' +
          '([Hendriks et al., 2013](https://www.sciencedirect.com/science/article/abs/pii/S1352231012011673)). ' +
          'Which is what makes the question worth asking at all: the WHO’s guideline for ' +
          'long-term PM2.5 is 5 µg/m³, the EU’s limit falls to 10 in 2030, and the ' +
          'European Environment Agency attributes about 172,000 deaths in 2023 to what ' +
          'is left above it ' +
          '([EEA, 2025](https://www.eea.europa.eu/en/analysis/publications/harm-to-human-health-from-air-pollution-burden-of-disease-status-2025)). ' +
          'Knowing that two thirds came from abroad is not an excuse. It is a list of ' +
          'the conversations that have to happen.\n' +
          '\n' +
          'This page and that graph are two readings of the same JSON. ' +
          '{{!flow:Show me the flow}}',
      },
    ],
  },
  sockets: [],
  children: [
    /*
     * Everything TOPAS publishes, behind one node. Fifteen fetches and their
     * string-building live inside it; what is left out here is a picture of
     * air quality, which is what this flow is about.
     */
    topasSources(),
    /*
     * The one file everything else is worked out from, and it lives OUT here:
     * what a flow points at is a decision, and a decision buried fifteen nodes
     * inside a subflow is one nobody makes twice.
     */
    {
      type: 'net-request',
      title: 'TOPAS config',
      id: 600,
      config: {
        url: '../tno-topas/config.json',
        method: 'GET',
        every: 0,
        title: 'TOPAS configuration',
        description: 'What the publisher says about its own data: paths, dates, regions, pollutants.',
      },
      sockets: [
        { id: 609, type: 'in', name: 'when' },
        { id: 608, type: 'in', name: 'url', format: 'string' },
        { id: 610, type: 'out', format: 'data' },
      ],
      ui: { position: { x: 2, y: 6 } },
    },
    {
      type: 'data-choice',
      title: 'Which pollutant',
      id: 630,
      /*
       * Whatever TOPAS publishes, all of it. A filter used to sit in front of
       * this naming four of the five — and a list typed into a flow is a
       * second copy of a fact the publisher already states, wrong the day they
       * add a sixth. Each item IS the name, so no paths beyond the list.
       */
      config: { list: 'regions.0.pollutants', label: '', value: '', as: 'text', which: 1 },
      sockets: [
        { id: 631, type: 'in', formats: ['data', 'geo', 'point', 'number', 'grid'] },
        { id: 632, type: 'out', format: 'string' },
      ],
      // Where the filter stood: the config feeds it directly now.
      ui: { position: { x: 20, y: 5 } },
    },
    {
      type: 'data-switch',
      title: 'Which Dutch network',
      id: 500,
      /*
       * One Dutch measuring network, or none. The European one used to be a
       * third input here, which put a choice on the map that could not be
       * looked at: picking it left the reader on a map fitted to the
       * Netherlands with its markers spread from Portugal to Finland, all of
       * them off screen. A network belongs to the map its data fits.
       */
      config: { which: 1 },
      /*
       * Files, not places. The sockets said `geo` from when this switch chose
       * between two lists of stations, and kept saying it after it began
       * carrying whole network files — so the editor counted three sockets
       * whose type never settled and said so in the toolbar. It was right:
       * everything ran, because a saved connection is not re-checked, and the
       * flow was still describing itself wrongly.
       */
      sockets: [
        { id: 510, type: 'in', formats: ['data'] },
        { id: 511, type: 'in', formats: ['data'] },
        { id: 512, type: 'out', format: 'data' },
      ],
      ui: { position: { x: 40, y: 26 } },
    },
    {
      type: 'graph-map',
      title: 'The Netherlands',
      id: 300,
      /*
       * A window on one country, and it says so.
       *
       * `bounded` makes the fit the widest view there is: every gesture from
       * there is a closer look, and a reader who scrolls twice is not looking
       * at Kazakhstan with a country-sized raster somewhere off screen. The
       * saved centre and zoom are what it opens on, so the two maps in this
       * flow start where their own data is rather than wherever the last
       * arriving layer dragged them.
       */
      /*
       * No saved view, and that is the point.
       *
       * A `zoom` in the config means "open here" and switches the fit OFF —
       * which is right for a map somebody framed by hand and wrong for one
       * whose whole job is to show a dataset. Pinned to zoom 7 this cropped
       * its own raster: the grid runs from 50.66°N to 53.69°N and the top of
       * it was off the frame. Fitted, the widest view IS the data, and
       * `bounded` makes that the widest view there is.
       */
      config: {
        track: false, follow: true, bounded: true, slackX: 0.08, slackY: 0.08,
        // The graph beside this map is empty until something is pressed, and an
        // empty picture next to a full map reads as broken rather than waiting.
        pickFirst: true,
      },
      /*
       * The air underneath, and whichever network the switch is letting
       * through. Generic inputs — a layer is a layer, and which kind it
       * carries is the business of whatever is wired in.
       */
      sockets: [
        { id: 312, type: 'in', formats: ['geo', 'grid'] },
        { id: 310, type: 'in', formats: ['geo', 'grid'] },
        // Where a pressed marker comes out, waiting for something to ask.
        { id: 313, type: 'out', format: 'geo' },
      ],
      ui: { position: { x: 62, y: 12 } },
    },
    {
      type: 'graph-map',
      title: 'Europe',
      id: 700,
      /*
       * The same model over a continent, and a second node rather than a
       * second layer on the first.
       *
       * One map cannot hold both. Fitting a view to the Netherlands and to
       * Europe at once means fitting it to Europe, and the Dutch raster then
       * occupies forty pixels; the zoom a reader is allowed, where the map
       * opens and how much room it keeps around the data are all answers to
       * "which dataset is this about", and there are two datasets.
       *
       * Zoomed out further than its neighbour and slacker around the edges,
       * because a continent's raster reaches the corners of its own box.
       */
      config: {
        track: false, follow: true, bounded: true, slackX: 0.04, slackY: 0.04,
        pickFirst: true,
      },
      sockets: [
        { id: 712, type: 'in', formats: ['geo', 'grid'] },
        { id: 710, type: 'in', formats: ['geo', 'grid'] },
        { id: 713, type: 'out', format: 'geo' },
      ],
      ui: { position: { x: 62, y: 40 } },
    },
    /*
     * The stations, shaped OUT here rather than inside the machinery.
     *
     * Because the switch now carries whole files, and a file is what a click
     * needs: one knob decides both what the map draws and what a press can
     * ask for. Shaped in two places rather than one because the two maps take
     * different files — and the European list is capped harder, since 2,845
     * markers on a continent is a smear, not a picture.
     */
    stationsToDraw(3200, { x: 44, y: 12 }),
    stationsToDraw(3300, { x: 44, y: 44 }),
    stationReadings(3000, 'regions.0.id', { x: 75, y: 4 }),
    /*
     * The same click, asked a second question.
     *
     * A separate instance rather than a switch inside one, because both
     * answers are wanted at once: the sectors and the countries of the same
     * bar, side by side. It costs one more fetch per press and buys the
     * comparison the whole page is about.
     */
    stationReadings(3400, 'regions.0.id', { x: 75, y: 36 }, 'series.types.countries'),

    // And the same pair for Europe, in its own column: one press, two
    // questions, on whichever map was pressed.
    stationReadings(3100, 'regions.1.id', { x: 88, y: 4 }),
    /*
     * Capped, and only here. The European country file lists all thirty-seven
     * of them plus the naturals — forty-four bands, of which four are the
     * answer. The Dutch one names sixteen and is readable whole, so it is left
     * alone: a rule applied where it does not bite only hides data.
     */
    stationReadings(3500, 'regions.1.id', { x: 88, y: 36 }, 'series.types.countries', 12),
    {
      type: 'graph-plot',
      title: 'One station, by sector',
      id: 1100,
      /*
       * Bars, not a line. These are daily values — one number per day, each
       * standing on its own — and a line between them draws a claim nobody
       * made: that the air went smoothly from Tuesday's number to Wednesday's.
       * A bar says "this day, this much", which is all the file says.
       */
      config: { style: 'bars' },
      sockets: [{ id: 1110, type: 'in', formats: ['number', 'point', 'stack'] }],
      ui: { position: { x: 75, y: 20 } },
    },
    {
      type: 'graph-plot',
      title: 'The same station, by country',
      id: 1300,
      config: { style: 'bars' },
      sockets: [{ id: 1310, type: 'in', formats: ['number', 'point', 'stack'] }],
      ui: { position: { x: 75, y: 52 } },
    },
    {
      type: 'graph-plot',
      title: 'One European station, by sector',
      id: 1200,
      config: { style: 'bars' },
      sockets: [{ id: 1210, type: 'in', formats: ['number', 'point', 'stack'] }],
      ui: { position: { x: 88, y: 20 } },
    },
    {
      type: 'graph-plot',
      title: 'The same European station, by country',
      id: 1400,
      config: { style: 'bars' },
      sockets: [{ id: 1410, type: 'in', formats: ['number', 'point', 'stack'] }],
      ui: { position: { x: 88, y: 52 } },
    },
  ],
  connections: [
    // The config, into the machinery and into the chooser beside it.
    { id: 1020, from: 600, to: 2000, out: 610, in: 2010 },
    { id: 1021, from: 600, to: 630, out: 610, in: 631 },
    { id: 1023, from: 630, to: 2000, out: 632, in: 2011 },

    // Two Dutch networks into the switch — as files, so that what is chosen
    // is both what the map draws and what a press may ask.
    { id: 1002, from: 2000, to: 500, out: 2003, in: 510 },
    { id: 1003, from: 2000, to: 500, out: 2004, in: 511 },
    { id: 1004, from: 500, to: 3200, out: 512, in: 3210 },
    { id: 1030, from: 630, to: 3200, out: 632, in: 3211 },
    { id: 1006, from: 3200, to: 300, out: 3201, in: 310 },
    { id: 1005, from: 2000, to: 300, out: 2001, in: 312 },

    // And the European pair on the map that fits them: raster underneath,
    // the EEA's stations on top.
    { id: 1008, from: 2000, to: 700, out: 2002, in: 712 },
    { id: 1014, from: 2000, to: 3300, out: 2005, in: 3310 },
    { id: 1032, from: 630, to: 3300, out: 632, in: 3311 },
    { id: 1007, from: 3300, to: 700, out: 3301, in: 710 },

    /*
     * The chain a click sets off, once per map: the pressed place goes in
     * along with the file it came from, and readings come out. The network
     * file is the same one the map is drawing, so pressing a citizen sensor
     * asks under the citizen network's name rather than the official one's.
     */
    { id: 1009, from: 300, to: 3000, out: 313, in: 3010 },
    { id: 1010, from: 500, to: 3000, out: 512, in: 3011 },
    { id: 1011, from: 600, to: 3000, out: 610, in: 3012 },
    { id: 1012, from: 630, to: 3000, out: 632, in: 3013 },
    { id: 1013, from: 3000, to: 1100, out: 3001, in: 1110 },

    // The second question about the same press: four identical inputs, one
    // different key inside, and a chart of its own.
    { id: 1033, from: 300, to: 3400, out: 313, in: 3410 },
    { id: 1034, from: 500, to: 3400, out: 512, in: 3411 },
    { id: 1035, from: 600, to: 3400, out: 610, in: 3412 },
    { id: 1036, from: 630, to: 3400, out: 632, in: 3413 },
    { id: 1037, from: 3400, to: 1300, out: 3401, in: 1310 },

    { id: 1015, from: 700, to: 3100, out: 713, in: 3110 },
    { id: 1016, from: 2000, to: 3100, out: 2005, in: 3111 },
    { id: 1017, from: 600, to: 3100, out: 610, in: 3112 },
    { id: 1018, from: 630, to: 3100, out: 632, in: 3113 },
    { id: 1019, from: 3100, to: 1200, out: 3101, in: 1210 },

    // And the European press, asked the other way.
    { id: 1038, from: 700, to: 3500, out: 713, in: 3510 },
    { id: 1039, from: 2000, to: 3500, out: 2005, in: 3511 },
    { id: 1040, from: 600, to: 3500, out: 610, in: 3512 },
    { id: 1041, from: 630, to: 3500, out: 632, in: 3513 },
    { id: 1042, from: 3500, to: 1400, out: 3501, in: 1410 },
  ],
});
