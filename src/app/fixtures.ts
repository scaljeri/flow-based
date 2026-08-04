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
 * A generator feeds a time-series plot and a logger — values flowing and two
 * ways of reading them. A formula produces f(x) = x^2, and the derivative
 * node turns it into f'(x) = 2x, symbolically: the orange line carries a
 * FUNCTION, not numbers. It needs the math and graphs modules, which the app
 * enables before loading it.
 *
 * A function, because ids must be fresh per creation — the demo can be
 * recreated next to flows that already borrowed these numbers.
 */
export const demo = () => ({
  id: 1,
  type: 'flow',
  title: 'demo',
  // Bumped when the fixture changes shape; the app reseeds on mismatch.
  config: { seedVersion: 3 },
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
  ],
  /*
   * Two sampled chains side by side — the wave and its slope — and the same
   * function once more as a path through the complex plane. The samplers run
   * in sweep mode, so every picture stands complete the moment the page
   * opens. Nothing else: the demo is the complex story now.
   */
  connections: [
    { id: 1002, from: 400, to: 500, out: 410, in: 510 },
    { id: 1003, from: 400, to: 600, out: 410, in: 610 },
    { id: 1004, from: 500, to: 700, out: 511, in: 710 },
    { id: 1005, from: 600, to: 200, out: 611, in: 210 },
    { id: 1007, from: 600, to: 900, out: 611, in: 910 },
    { id: 1006, from: 700, to: 800, out: 711, in: 810 },
  ],
});
