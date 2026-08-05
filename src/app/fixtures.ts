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
      type: 'graph-complex',
      title: 'Complex plane',
      id: 900,
      sockets: [{ id: 910, type: 'in', formats: ['number', 'point'] }],
      position: { x: 27, y: 48 },
    },
    {
      type: 'random-numbers',
      title: 'Random number generator',
      id: 100,
      config: {
        min: 0,
        max: 100,
        start: 0,
        end: 1,
        intervalMax: 10000,
        intervalMin: 100,
        interval: 1000,
        integer: true,
      },
      sockets: [{ id: 110, type: 'out', format: 'number' }],
      position: { x: 6, y: 34 },
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
      position: { x: 34, y: 18 },
    },
  ],
  connections: [{ id: 1000, from: 100, to: 200, out: 110, in: 210 }],
};

export const showcase =
  {
    "id": 1546340247802,
    "children": [
      {
        "type": "custom",
        "title": "Filter click",
        "id": 1546892321364,
        "config": {
          "func": "// const out = new Subject();\n// function(val) {\nif (val && val.x && val.y) {\n    out.next(val)\n}",
          "expanded": false
        },
        "sockets": [
          {
            "id": 1546892321365,
            "type": "in"
          },
          {
            "id": 1546892321366,
            "type": "out"
          }
        ],
        "position": {
          "x": 31.165161132812486,
          "y": 55.20859297108673
        }
      },
      {
        "type": "custom",
        "title": "Mandelbrot point",
        "id": 1546976282116,
        "config": {
          "func": "// const out = new Subject();\n// function(val) {\n\nfunction convert(x, y) {\n    const ox = (x - -4) / (4 - -4) * val.width;\n    const oy = (y - -4) / (4 - -4) * val.height;\n    \n    return [Math.round(ox), Math.round(oy)];\n}\n\nif (val) {\n  const cR = val.x;\n  const cI = val.y;\n  const instr = [{\n    type: 'curve',\n    data: convert(val.x, val.y)\n    }, {\n       type: 'text',\n       data: [{\n       x: 5,\n       y: 50,\n       value: 'points: '}]\n    }\n  ];\n  \n  let i, x, y, nR, nI, zR = 0, zI = 0;\n  for(i = 0; i< val.maxIterations; i++) {\n      nR = zR * zR - zI * zI + cR;\n      nI = 2 * zI * zR + cI;\n\n      zR = nR;\n      zI = nI;\n      [x, y] = convert(zR, zI);\n      if (Math.abs(zR) <= 4 || Math.abs(zI) <= 4) {\n        instr[0].data.push( x, y );\n      } else {\n        break;\n      }\n  }\n  \n  \n  instr[0].data.push( x, y );\n  instr[1].data[0].value += (i + 1);\n  \n \n  out.next(instr);\n}",
          "expanded": false
        },
        "sockets": [
          {
            "id": 1546976282117,
            "type": "in"
          },
          {
            "id": 1546976282118,
            "type": "out"
          }
        ],
        "position": {
          "x": 39.22932942708332,
          "y": 65.5733804083295
        }
      },
      {
        "type": "zoomcanvas",
        "title": "Zoomable canvas",
        "id": 1546340247806,
        "config": {
          "expanded": true
        },
        "sockets": [
          {
            "id": 1546340247807,
            "type": "in",
            "format": "imageData"
          },
          {
            "id": 1546340247808,
            "type": "out",
            "format": "dimension"
          }
        ],
        "position": {
          "x": 7.003987630208346,
          "y": 35.93072286247781
        }
      },
      {
        "type": "fractals",
        "title": "Fractals",
        "id": 1546340247803,
        "config": {
          "selected": "mandelbrot"
        },
        "sockets": [
          {
            "id": 1546340247804,
            "type": "in",
            "format": "dimension"
          },
          {
            "id": 1546340247805,
            "type": "out",
            "format": "imageData"
          }
        ],
        "position": {
          "x": 6.805419921875002,
          "y": 5.184057203389836
        }
      },
      {
        "type": "fractals",
        "title": "Fractals",
        "id": 1546891939413,
        "config": {
          "selected": "julia"
        },
        "sockets": [
          {
            "id": 1546891939414,
            "type": "in",
            "format": "dimension"
          },
          {
            "id": 1546891939415,
            "type": "out",
            "format": "imageData"
          }
        ],
        "position": {
          "x": 26.00809733072917,
          "y": 5.168089481555324
        }
      },
      {
        "type": "zoomcanvas",
        "title": "Zoomable canvas",
        "id": 1546891939417,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1546891939418,
            "type": "in",
            "format": "imageData"
          },
          {
            "id": 1546891939419,
            "type": "out",
            "format": "dimension"
          }
        ],
        "position": {
          "x": 40.900472005208336,
          "y": 4.948435942173486
        }
      },
      {
        "type": "canvas",
        "title": "Canvas",
        "id": 1546976282122,
        "config": {
          "expanded": true
        },
        "sockets": [
          {
            "id": 1546976282123,
            "type": "in"
          },
          {
            "id": 1546976282124,
            "type": "out",
            "format": "point"
          }
        ],
        "position": {
          "x": 54.081217447916664,
          "y": 42.758443419740765
        }
      }
    ],
    "connections": [
      {
        "from": 1546976282116,
        "out": 1546976282118,
        "to": 1546976282122,
        "in": 1546976282123,
        "id": 1546976282125
      },
      {
        "from": 1546892321364,
        "out": 1546892321366,
        "to": 1546976282116,
        "in": 1546976282117,
        "id": 1546976282121
      },
      {
        "from": 1546340247806,
        "out": 1546340247808,
        "to": 1546892321364,
        "in": 1546892321365,
        "id": 1546971921082
      },
      {
        "from": 1546892321364,
        "out": 1546892321366,
        "to": 1546891939413,
        "in": 1546891939414,
        "id": 1546895326226
      },
      {
        "from": 1546891939417,
        "out": 1546891939419,
        "to": 1546891939413,
        "in": 1546891939414,
        "id": 1546891939421
      },
      {
        "from": 1546891939413,
        "out": 1546891939415,
        "to": 1546891939417,
        "in": 1546891939418,
        "id": 1546891939420
      },
      {
        "from": 1546340247806,
        "out": 1546340247808,
        "to": 1546340247803,
        "in": 1546340247804,
        "id": 1546374626401
      },
      {
        "from": 1546340247803,
        "out": 1546340247805,
        "to": 1546340247806,
        "in": 1546340247807,
        "id": 1546340574657
      }
    ]
  }

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
  config: { seedVersion: 7 },
  /*
   * The flow, read as a document. It used to be a nine-section course that
   * ended on a damped spiral and a symbolic derivative, which is more than a
   * reader who came for "what is an imaginary number" can carry — so the
   * ladder is now four rungs and one payoff: a line cannot turn → so name
   * the quarter turn i and the numbers gain a plane → e puts that turn into
   * every step, so you walk a circle and never leave it → the two
   * coordinates of that walk ARE the cosine and the sine.
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
          'Pluck a string. Push a swing. Watch a buoy ride the swell. You get a wave — ' +
          'the same shape every time, rising and falling, never in a hurry.\n' +
          '\n' +
          'This page is about something else: a point going round a circle, steady ' +
          'speed, forever. Every figure below is a node of this flow, still computing ' +
          'while you read, and the pink numbers are yours to change — type one, or ' +
          'drag it sideways. What kind of number describes that walk?',
      },
      { type: 'node', nodeId: 1000, float: 'right', width: '300px', caption: 'The formula this page is heading for' },

      { type: 'heading', text: 'You cannot go round on a line', level: 2 },
      {
        type: 'text',
        text:
          'The numbers you grew up with sit on a line. Left, right, and nothing else. ' +
          'A line cannot turn.\n' +
          '\n' +
          'So ask for the turn instead. What can you do to $1$, twice in a row, that ' +
          'lands you on $-1$? A flip does it in one move, so each of your two moves is ' +
          'half a flip: a quarter turn. Call that quarter turn $i$:\n' +
          '\n' +
          '$$i \\cdot i = -1$$\n' +
          '\n' +
          'That hands numbers a second direction — across is real, up is imaginary — ' +
          'and any point is $a + b\\,i$: how far across, how far up. Nothing spooky: in ' +
          'this flow a complex value is literally the pair `{re, im}`, and the wires ' +
          'carry it as ordinary data.\n' +
          '\n' +
          'So multiplying no longer only stretches; it stretches *and* turns. Multiply ' +
          '$1$ by $i$ over and over: $i$, $-1$, $-i$, $1$. Four quarter turns and you ' +
          'are home. That is the walk, in four clumsy steps.',
      },

      { type: 'heading', text: 'A turn that never stops', level: 2 },
      { type: 'node', nodeId: 1200, float: 'right', caption: 'One point, going round, right now' },
      {
        type: 'text',
        text:
          'Four steps make a square, not a circle. For a circle the turning must never ' +
          'stop. Read $e^x$ as *grow in the direction you already face* — which is why ' +
          'it runs away with you.\n' +
          '\n' +
          'Now put $i$ in the exponent, and every step gets turned a right angle ' +
          'first. A push at right angles cannot speed you up or slow you down; it can ' +
          'only aim you somewhere else. Your distance from zero never changes, so ' +
          'nothing is left but turning: you walk a circle of radius $1$ and never get ' +
          'off.\n' +
          '\n' +
          '$$e^{i\\,x}$$\n' +
          '\n' +
          'The figure beside this text is that walk, live — and $x$ is not an angle in ' +
          'degrees. It is how far you have gone around the rim. Once round is about ' +
          '$6.28$, which is why this walk stops at {{1000:x.to}}: a hair past a lap, ' +
          'so the circle closes. Drag it down to $3$ and the circle stops being a ' +
          'circle — it opens into the arc you actually walked. Put it back and it ' +
          'closes.',
      },

      { type: 'heading', text: 'The shadow is the wave', level: 2 },
      { type: 'node', nodeId: 1300, float: 'left', caption: 'The same walk, seen from the side' },
      {
        type: 'text',
        text:
          'The walking point always has two numbers: how far across it is, and how far ' +
          'up. Throw one away and watch the other. Across, it slides out and back and ' +
          'out again; up, it rises and falls. Plot each against how far you have ' +
          'walked and there they are: two waves, from a point that never wiggled ' +
          'once.\n' +
          '\n' +
          'You already know their names. Across is the cosine, up is the sine:\n' +
          '\n' +
          '$$e^{i\\,x} = \\cos x + i\\,\\sin x$$\n' +
          '\n' +
          'Euler’s formula — not a new fact, just the same walk written twice. The ' +
          'circle above and the waves beside this paragraph come off one node: one set ' +
          'of numbers, drawn two ways.\n' +
          '\n' +
          'Before you touch it, guess. If the walker goes round twice as fast, what ' +
          'happens to each picture? The speed is $b =$ {{1000:params.b}} — set it to ' +
          '$2$ and find out. The circle does not budge: same radius, same rim, walked ' +
          'twice over. The wave crowds into twice the humps. Faster spin, shorter ' +
          'wave, higher note.\n' +
          '\n' +
          'Sine was never a fact about triangles. It is what a circle looks like from ' +
          'the side.',
      },

      { type: 'heading', text: 'Bonus: turning, but shrinking', level: 2 },
      { type: 'node', nodeId: 900, float: 'right', caption: 'Turning and shrinking at once — a spiral' },
      {
        type: 'text',
        text:
          'One knob more, then you are done. The flow holds a second formula that ' +
          'turns like the first, but lets its distance from the middle leak away as it ' +
          'goes. Turning plus leaking is a spiral, and the leak is yours: ' +
          '{{400:params.a}}. Set it to $0$ and the leaking stops — the spiral relaxes ' +
          'into the circle you started on, which was underneath it the whole time.',
      },

      {
        type: 'text',
        text:
          'Multiplying is turning, turning needs a plane, and a push that stays ' +
          'sideways walks a circle forever. The circle is not a picture of the wave — ' +
          'it *is* the wave, before a direction got thrown away.\n' +
          '\n' +
          'Now flip to the flow view: that graph and this page are the same JSON, read ' +
          'twice.',
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
      position: { x: 4, y: 4 },
    },
    {
      type: 'math-derivative',
      title: 'Derivative',
      id: 500,
      sockets: [
        { id: 510, type: 'in', format: 'function' },
        { id: 511, type: 'out', format: 'function' },
      ],
      position: { x: 54, y: 4 },
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
      position: { x: 6, y: 20 },
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
      position: { x: 56, y: 20 },
    },
    {
      type: 'graph-timeseries',
      title: 'Wave',
      id: 200,
      config: { style: 'line' },
      sockets: [{ id: 210, type: 'in', formats: ['number', 'point'] }],
      position: { x: 2, y: 34 },
    },
    {
      type: 'graph-timeseries',
      title: 'Slope',
      id: 800,
      config: { style: 'line' },
      sockets: [{ id: 810, type: 'in', formats: ['number', 'point'] }],
      position: { x: 52, y: 34 },
    },
    {
      type: 'graph-complex',
      title: 'Complex plane',
      id: 900,
      sockets: [{ id: 910, type: 'in', formats: ['number', 'point'] }],
      position: { x: 27, y: 48 },
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
      position: { x: 78, y: 4 },
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
      position: { x: 80, y: 20 },
    },
    {
      type: 'graph-complex',
      title: 'Unit circle',
      id: 1200,
      sockets: [{ id: 1210, type: 'in', formats: ['number', 'point'] }],
      position: { x: 77, y: 34 },
    },
    {
      type: 'graph-timeseries',
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
      position: { x: 77, y: 56 },
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
  ],
});
