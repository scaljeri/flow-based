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
 * and a second, minimal chain draws the pure circle e^(i·b·x) — the document
 * leans on it where Euler's formula needs a picture. It needs the math and
 * graphs modules, which the app enables before loading it.
 *
 * A function, because ids must be fresh per creation — the demo can be
 * recreated next to flows that already borrowed these numbers.
 */
export const demo = () => ({
  id: 1,
  type: 'flow',
  title: 'demo',
  // Bumped when the fixture changes shape; the app reseeds on mismatch.
  config: { seedVersion: 6 },
  /*
   * The flow, read as a document: a true "imaginary numbers 101", taught by
   * the flow's own nodes. The figures are not screenshots — each one mounts
   * the node's live content, so the spiral in the prose is the spiral the
   * editor draws, still computing. The ladder: an impossible equation → the
   * powers of i loop → the plane resolves the loop → adding shifts,
   * multiplying turns → e aims growth sideways and circles → add decay and
   * it spirals → the plots are that spiral's shadows. Headings stay plain
   * text (no inline parsing there); formulas live in the paragraphs as
   * $...$ and $$...$$.
   */
  document: {
    title: 'Imaginary numbers, drawn',
    blocks: [
      {
        type: 'text',
        text:
          'Every figure on this page is alive: it is one of the flow’s own nodes, ' +
          'still computing while you read. The whole page draws one function, ' +
          '`e^((b*i - a)*x)`. Right now that is noise — by the last section you ' +
          'will read it at a glance.',
      },
      { type: 'node', nodeId: 400, float: 'right', width: '300px', caption: 'The page’s one formula, live' },

      { type: 'heading', text: 'A number the line does not hold', level: 2 },
      {
        type: 'text',
        text:
          'Try to solve $x^2 = -1$. No real number answers it: positives square to ' +
          'positives, negatives square to positives, zero squares to zero. The real ' +
          'numbers form a line, and every point on that line fails.\n' +
          '\n' +
          'Mathematics has a move for this. Name a new number into existence, define ' +
          'it by the one property you need, and check that arithmetic survives:\n' +
          '\n' +
          '$$i^2 = -1$$\n' +
          '\n' +
          'That is the whole definition. But if $i$ is a number and it is not on the ' +
          'line, it must live somewhere *off* the line.',
      },

      { type: 'heading', text: 'The powers of i go in circles', level: 2 },
      {
        type: 'text',
        text:
          'Before asking where, just multiply. $i^1 = i$. $i^2 = -1$, by definition. ' +
          '$i^3 = i^2 \\cdot i = -i$. And $i^4 = (i^2)^2 = 1$ — back to the start:\n' +
          '\n' +
          '$$i,\\quad i^2 = -1,\\quad i^3 = -i,\\quad i^4 = 1$$\n' +
          '\n' +
          'Then it repeats, forever, with period four. That is strange. Powers of a ' +
          'real number shoot off or die out; the powers of $i$ walk in a loop. The ' +
          'next section makes the loop obvious.',
      },

      { type: 'heading', text: 'A place to live: the plane', level: 2 },
      {
        type: 'text',
        text:
          'Put $i$ one unit *above* the line. Real axis across, imaginary axis up, ' +
          'and every combination of the two is a point:\n' +
          '\n' +
          '$$z = a + b\\,i$$\n' +
          '\n' +
          '— $a$ across, $b$ up. $\\mathrm{Re}(z) = a$ and $\\mathrm{Im}(z) = b$ are ' +
          'simply its two coordinates. Nothing mystical: on this page a complex value ' +
          'is literally the pair `{re, im}`.\n' +
          '\n' +
          'Now the puzzle dissolves. $1$, $i$, $-1$ and $-i$ are the four compass ' +
          'points of the plane — and each multiplication by $i$ moved the answer a ' +
          'quarter turn on.',
      },

      { type: 'heading', text: 'Adding shifts, multiplying turns', level: 2 },
      {
        type: 'text',
        text:
          'Two rules pay for everything that follows. Adding is coordinate-wise, ' +
          'a shift: $(a + b\\,i) + (c + d\\,i) = (a+c) + (b+d)\\,i$. Multiplying by ' +
          '$i$ is the quarter turn you just watched: $i\\,(a + b\\,i) = -b + a\\,i$ — ' +
          'check it on $1$, which goes to $i$. Multiplying by $2$ stretches. ' +
          'Multiplying by a general complex number does both at once: **rotate and ' +
          'stretch**.\n' +
          '\n' +
          'One quarter turn is crude. For a curve, the turning has to happen ' +
          'continuously — and that is a job for $e$.',
      },

      { type: 'heading', text: 'Growth aimed sideways', level: 2 },
      { type: 'node', nodeId: 1200, float: 'right', caption: 'e to an imaginary power: turning, never stretching' },
      {
        type: 'text',
        text:
          '$e^x$ means “grow in proportion to where you are”: the step you take points ' +
          '*along* where you stand. Put $i$ in the exponent and each step instead turns ' +
          'a right angle to where you stand — it changes your direction and never your ' +
          'distance. Compounded, that is pure turning at constant radius: a circle. It ' +
          'has a famous name:\n' +
          '\n' +
          '$$e^{i\\theta} = \\cos\\theta + i\\,\\sin\\theta$$\n' +
          '\n' +
          'So $e^{i\\,b\\,x}$ walks the unit circle as $x$ runs, with $b$ setting the ' +
          'speed. The figure beside this text is exactly that function, drawn live by ' +
          'the flow.',
      },

      { type: 'heading', text: 'Shrink while you turn', level: 2 },
      { type: 'node', nodeId: 900, float: 'right', caption: 'Turning and shrinking at once — a logarithmic spiral' },
      {
        type: 'text',
        text:
          'The page’s formula adds one knob to Euler:\n' +
          '\n' +
          '$$e^{(b\\,i - a)\\,x} = e^{-a\\,x}\\,\\bigl(\\cos b\\,x + i\\,\\sin b\\,x\\bigr)$$\n' +
          '\n' +
          'The $b\\,i$ turns, the $-a$ shrinks; together they trace a **logarithmic ' +
          'spiral** into the origin — here with $a =$ {{400:params.a}} and $b =$ ' +
          '{{400:params.b}}. Both are yours: type a value, or drag one sideways.\n' +
          '\n' +
          'Set $a$ to $0$. The shrinking stops, and the spiral relaxes into the unit ' +
          'circle of the last section — that *is* $e^{i\\,b\\,x}$. Make $a$ negative ' +
          'and decay becomes growth: the spiral winds outward. Set $b$ to $0$ and the ' +
          'turning stops: pure $e^{-a\\,x}$, a march straight down the real axis. ' +
          'Every complex behaviour on this page is these two dials, mixed.',
      },

      { type: 'heading', text: 'A circle seen from the side is a wave', level: 2 },
      { type: 'node', nodeId: 200, float: 'left', caption: 'The spiral’s shadow on the real axis' },
      {
        type: 'text',
        text:
          'The plots are not new functions — they are shadows. Project the spiral onto ' +
          'the real axis and you get the damped cosine the **Wave** plot draws:\n' +
          '\n' +
          '$$\\mathrm{Re}\\bigl(e^{(b\\,i - a)\\,x}\\bigr) = e^{-a\\,x}\\cos b\\,x$$\n' +
          '\n' +
          'The imaginary part is the matching damped sine, a quarter turn behind. That ' +
          'is why oscillation and decay show up together all over physics: they are one ' +
          'complex object, watched from the side. The plots watch $x$ from $0$ to ' +
          '{{400:x.to}} — extend it and more of the story fits in the frame.',
      },

      { type: 'heading', text: 'The spiral knows its own slope', level: 2 },
      { type: 'node', nodeId: 800, float: 'right', caption: 'The derivative — the same spiral, times k' },
      {
        type: 'text',
        text:
          'One more rung, for free. The derivative of an exponential is the function ' +
          'multiplied by its own exponent:\n' +
          '\n' +
          '$$\\frac{d}{dx}\\,e^{k\\,x} = k\\,e^{k\\,x}$$\n' +
          '\n' +
          'Here $k = b\\,i - a$ — and multiplying, you now know, is rotate-and-stretch. ' +
          'So the **Slope** plot is the Wave’s story shifted in phase and scaled, ' +
          'nothing more. No finite differences were harmed: the derivative node ' +
          'differentiates the *expression* and hands on a new function.',
      },

      { type: 'heading', text: 'Backstage', level: 2 },
      { type: 'node', nodeId: 500, float: 'right', width: '300px', caption: 'A function travelled this wire, not numbers' },
      {
        type: 'text',
        text:
          'One paragraph of machinery. Between the formulas and their pictures sit ' +
          'samplers: each sweeps the declared domain and emits the run of `[x, re, im]` ' +
          'samples. Only data crosses the wires, never code — the plots know nothing of ' +
          '$e$ or $i$, they draw what arrives. Flip back to the flow view to see the ' +
          'wiring itself: that graph and this document are two readings of the same ' +
          'JSON.',
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
       * The pure circle e^(i·b·x), fixed at b = 1. The document's Euler
       * section needs a picture of turning WITHOUT shrinking, and the
       * showpiece cannot provide it while its a stays nonzero — so a small
       * separate chain draws the circle permanently, and the spiral's
       * "set a to 0" moment gets a reference to relax into.
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
  ],
  /*
   * Two sampled chains side by side — the wave and its slope — the same
   * function once more as a path through the complex plane, and a third,
   * minimal chain drawing the pure circle e^(i·b·x) for the document's
   * Euler section. The samplers run in sweep mode, so every picture stands
   * complete the moment the page opens. Nothing else: the demo is the
   * complex story now.
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
  ],
});
