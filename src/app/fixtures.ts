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
  config: { seedVersion: 23 },
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
          'Now move $c$ and watch it break. It is at $c =$ {{1900:c.re}} $+$ ' +
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
          'beside it is that point\u2019s walk. Press deep inside the black and it ' +
          'settles. Press well outside and it is gone in a few steps. Press *just* on ' +
          'the edge and it does neither for a long time — which is what the edge is.\n' +
          '\n' +
          'And that edge is where it stops being ordinary. Look closer at it and it does ' +
          'not smooth out, the way a circle does. There is always more of it, at every ' +
          'scale, and it never repeats and never settles down.',
      },
      { type: 'node', nodeId: 1700, float: 'right', caption: 'Places people gave names to' },
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
      position: { x: 2, y: 4 },
    },
    {
      type: 'math-derivative',
      title: 'Derivative',
      id: 500,
      sockets: [
        { id: 510, type: 'in', format: 'function' },
        { id: 511, type: 'out', format: 'function' },
      ],
      position: { x: 26, y: 4 },
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
      position: { x: 2, y: 22 },
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
      position: { x: 26, y: 22 },
    },
    {
      type: 'graph-timeseries',
      title: 'Wave',
      id: 200,
      config: { style: 'line' },
      sockets: [{ id: 210, type: 'in', formats: ['number', 'point'] }],
      position: { x: 2, y: 42 },
    },
    {
      type: 'graph-timeseries',
      title: 'Slope',
      id: 800,
      config: { style: 'line' },
      sockets: [{ id: 810, type: 'in', formats: ['number', 'point'] }],
      position: { x: 26, y: 42 },
    },
    {
      type: 'graph-complex',
      title: 'Complex plane',
      id: 900,
      sockets: [{ id: 910, type: 'in', formats: ['number', 'point'] }],
      position: { x: 2, y: 64 },
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
      position: { x: 50, y: 4 },
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
      position: { x: 50, y: 22 },
    },
    {
      type: 'graph-complex',
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
      position: { x: 50, y: 42 },
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
      position: { x: 76, y: 4 },
    },
    {
      type: 'graph-complex',
      title: 'Four powers of i',
      id: 1500,
      sockets: [{ id: 1510, type: 'in', formats: ['number', 'point', 'marks'] }],
      position: { x: 76, y: 22 },
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
      position: { x: 64, y: 22 },
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
      position: { x: 50, y: 64 },
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
      position: { x: 2, y: 86 },
    },
    {
      type: 'graph-mandelbrot',
      title: 'The Mandelbrot set',
      id: 1800,
      /*
       * The whole set to start with: the picture everyone has seen, before
       * anybody goes looking inside it.
       */
      config: { view: { re: -0.6, im: 0, span: 3.2 }, iterations: 200 },
      sockets: [
        { id: 1810, type: 'in', formats: ['region'] },
        { id: 1811, type: 'out', format: 'complex' },
      ],
      position: { x: 18, y: 84 },
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
      position: { x: 44, y: 86 },
    },
    {
      type: 'graph-complex',
      title: 'The orbit',
      id: 2000,
      sockets: [{ id: 2010, type: 'in', formats: ['number', 'point', 'marks'] }],
      position: { x: 60, y: 84 },
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
    { id: 1016, from: 1700, to: 1800, out: 1710, in: 1810 },
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
      position,
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
      position,
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
    position,
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
      position,
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
  const stations = { shape: 'geo', list: 'list', a: 'lat', b: 'lon', label: '', ref: 'code', limit: 400 };

  // What the publisher says about itself.
  const gridPathNl = reads('NL grid path', 'regions.0.gridPath', { x: 14, y: 4 });
  const gridPathEu = reads('EU grid path', 'regions.1.gridPath', { x: 14, y: 16 });
  const date = reads('date', 'currentDate', { x: 14, y: 28 });
  const idNl = reads('NL', 'regions.0.id', { x: 14, y: 40 });
  const idEu = reads('EU', 'regions.1.id', { x: 14, y: 52 });

  const lmlPath = reads('LML file', 'networks.0.path', { x: 14, y: 76 });
  const samenPath = reads('Samen Meten file', 'networks.1.path', { x: 14, y: 88 });
  const eeaPath = reads('EEA file', 'networks.2.path', { x: 14, y: 100 });

  // What that makes: a file name, then a whole URL.
  const gridFileNl = builds('NL grid file', ['pattern', 'region|lower', 'date', 'pollutant'], { x: 30, y: 4 });
  const gridFileEu = builds('EU grid file', ['pattern', 'region|lower', 'date', 'pollutant'], { x: 30, y: 20 });
  const eeaFile = builds('EEA file name', ['pattern', 'region|lower'], { x: 30, y: 88 });

  const base = '../tno-topas/{path}';
  const urlGridNl = builds('NL grid URL', ['path'], { x: 46, y: 4 }, base);
  const urlGridEu = builds('EU grid URL', ['path'], { x: 46, y: 20 }, base);
  const urlLml = builds('LML URL', ['path'], { x: 46, y: 40 }, base);
  const urlSamen = builds('Samen Meten URL', ['path'], { x: 46, y: 60 }, base);
  const urlEea = builds('EEA URL', ['path'], { x: 46, y: 88 }, base);

  // What is fetched, and what it turns into.
  const getGridNl = fetches('NL grid', { x: 62, y: 4 });
  const getGridEu = fetches('EU grid', { x: 62, y: 20 });
  const getLml = fetches('RIVM LML', { x: 62, y: 40 });
  const getSamen = fetches('Samen Meten', { x: 62, y: 60 });
  const getEea = fetches('EEA', { x: 62, y: 88 });

  const rasterNl = shapes('NL raster', { shape: 'grid' }, 'grid', { x: 78, y: 4 });
  const rasterEu = shapes('EU raster', { shape: 'grid' }, 'grid', { x: 78, y: 20 });
  const placesLml = shapes('LML places', { ...stations, limit: 200 }, 'geo', { x: 78, y: 40 });
  const placesSamen = shapes('Samen Meten places', stations, 'geo', { x: 78, y: 60 });
  const placesEea = shapes('EEA places', stations, 'geo', { x: 78, y: 88 });

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
    position: { x: 4, y: 30 },
    sockets: [
      { id: inn.config, type: 'in', name: 'config', format: 'data' },
      { id: inn.pollutant, type: 'in', name: 'pollutant', format: 'string' },
      { id: out.gridNl, type: 'out', name: 'NL grid', format: 'grid' },
      { id: out.gridEu, type: 'out', name: 'EU grid', format: 'grid' },
      { id: out.lml, type: 'out', name: 'NL · RIVM LML', format: 'geo' },
      { id: out.samen, type: 'out', name: 'NL · Samen Meten', format: 'geo' },
      { id: out.eea, type: 'out', name: 'EU · EEA', format: 'geo' },
      { id: out.config, type: 'out', name: 'config', format: 'data' },
      { id: out.date, type: 'out', name: 'date', format: 'string' },
    ],
    children: [
      gridPathNl.node, gridPathEu.node, date.node, idNl.node, idEu.node,
      lmlPath.node, samenPath.node, eeaPath.node,
      gridFileNl.node, gridFileEu.node, eeaFile.node,
      urlGridNl.node, urlGridEu.node, urlLml.node, urlSamen.node, urlEea.node,
      getGridNl.node, getGridEu.node, getLml.node, getSamen.node, getEea.node,
      rasterNl.node, rasterEu.node, placesLml.node, placesSamen.node, placesEea.node,
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
      wire(getLml, getLml.out, placesLml, placesLml.in),
      wire(getSamen, getSamen.out, placesSamen, placesSamen.in),
      wire(getEea, getEea.out, placesEea, placesEea.in),

      // And out, where the rest of the flow can see them.
      emit(rasterNl, rasterNl.out, out.gridNl),
      emit(rasterEu, rasterEu.out, out.gridEu),
      emit(placesLml, placesLml.out, out.lml),
      emit(placesSamen, placesSamen.out, out.samen),
      emit(placesEea, placesEea.out, out.eea),
      { id: nextId(), from: flowId, to: flowId, out: inn.config, in: out.config },
      emit(date, date.out, out.date),
    ],
  };
}

export const tno = () => ({
  id: 1,
  type: 'flow',
  title: 'tno',
  config: { seedVersion: 14 },
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
      position: { x: 2, y: 6 },
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
      config: { list: 'regions.0.pollutants', label: '', value: '', as: 'text', which: 0 },
      sockets: [
        { id: 631, type: 'in', formats: ['data', 'geo', 'point', 'number', 'grid'] },
        { id: 632, type: 'out', format: 'string' },
      ],
      // Where the filter stood: the config feeds it directly now.
      position: { x: 20, y: 5 },
    },
    {
      type: 'data-switch',
      title: 'Which network',
      id: 500,
      /*
       * One measuring network on the map, or none. Three now: two Dutch and
       * one European. Named by what arrives — a request says what it IS, and
       * a name typed on a socket would be a second copy of that.
       */
      config: { which: 1 },
      sockets: [
        { id: 510, type: 'in', formats: ['geo'] },
        { id: 511, type: 'in', formats: ['geo'] },
        { id: 513, type: 'in', formats: ['geo'] },
        { id: 512, type: 'out', format: 'geo' },
      ],
      position: { x: 40, y: 26 },
    },
    {
      type: 'graph-map',
      title: 'One network',
      id: 300,
      config: { track: false, follow: true },
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
      position: { x: 62, y: 20 },
    },
  ],
  connections: [
    // The config, into the machinery and into the chooser beside it.
    { id: 1020, from: 600, to: 2000, out: 610, in: 2010 },
    { id: 1021, from: 600, to: 630, out: 610, in: 631 },
    { id: 1023, from: 630, to: 2000, out: 632, in: 2011 },

    // Three networks into the switch, one of them onto the map.
    { id: 1002, from: 2000, to: 500, out: 2003, in: 510 },
    { id: 1003, from: 2000, to: 500, out: 2004, in: 511 },
    { id: 1007, from: 2000, to: 500, out: 2005, in: 513 },
    { id: 1006, from: 500, to: 300, out: 512, in: 310 },
    // The Dutch raster underneath it. The European one is on the subflow's
    // second socket, waiting for a second map.
    { id: 1005, from: 2000, to: 300, out: 2001, in: 312 },
  ],
});
