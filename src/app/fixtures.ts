export const basic =
  {
    "id": 1545429029660,
    "children": [
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1545430288532,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 500,
          "integer": true,
          "expanded": true,
          "integers": true
        },
        "sockets": [
          {
            "id": 1545430288533,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 7.966105143229168,
          "y": 1.938325648055832
        }
      },
      {
        "type": "custom",
        "title": "Dynamic stuff",
        "id": 1545430288534,
        "config": {
          "func": "// const out = new Subject();\n// function(val) {\nconsole.log(val);\n\nif (val % 2 === 0) {\n    out.next(val);\n}",
          "expanded": true
        },
        "sockets": [
          {
            "id": 1545430288535,
            "type": "in"
          },
          {
            "id": 1545430288536,
            "type": "out"
          }
        ],
        "position": {
          "x": 42.454833984375014,
          "y": 2.26897432701894
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1545430288538,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545430288539,
            "type": "in"
          },
          {
            "id": 1545430288540,
            "type": "out"
          }
        ],
        "position": {
          "x": 74.33044433593749,
          "y": 42.79738908275175
        }
      },
      {
        "type": "custom",
        "title": "Dynamic stuff",
        "id": 1545429029661,
        "config": {
          "func": "// const out = new Subject();\n// function(val) {\nlet count = 0;\n\nsetInterval(() => {\n  out.next(count++);\n}, 1000);",
          "expanded": true
        },
        "sockets": [
          {
            "id": 1545429029662,
            "type": "in"
          },
          {
            "id": 1545429029663,
            "type": "out",
            "color": "#3131ec"
          }
        ],
        "position": {
          "x": 8.121744791666664,
          "y": 41.479467846460615
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1545429029664,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545429029665,
            "type": "in",
            "color": "#fe02eb"
          },
          {
            "id": 1545429029666,
            "type": "out"
          }
        ],
        "position": {
          "x": 53.457845052083336,
          "y": 61.53103190428716
        }
      }
    ],
    "connections": [
      {
        "from": 1545430288532,
        "out": 1545430288533,
        "to": 1545430288534,
        "in": 1545430288535,
        "id": 1545430601045
      },
      {
        "from": 1545430288534,
        "out": 1545430288536,
        "to": 1545430288538,
        "in": 1545430288539,
        "id": 1545430288541
      },
      {
        "from": 1545429029661,
        "out": 1545429029663,
        "to": 1545429029664,
        "in": 1545429029665,
        "id": 1545429029667
      }
    ]
  }
