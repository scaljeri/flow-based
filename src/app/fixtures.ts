import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =
  {
    "children": [
      {
        "type": "stats",
        "title": "Statistics",
        "id": "1539086885081",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "s-a"
            },
            {
              "type": "out",
              "id": "max",
              "name": "Max value"
            },
            {
              "type": "out",
              "id": "min",
              "name": "Min value"
            }
          ]
        },
        "sockets": [
          {
            "type": "in",
            "id": "s-a"
          },
          {
            "type": "out",
            "id": "min",
            "name": "Min value"
          },
          {
            "type": "out",
            "id": "max",
            "name": "Max value"
          }
        ],
        "position": {
          "x": 350.9296875,
          "y": 263.125
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": "1539086889557",
        "config": {
          "sockets": [
            {
              "type": "out",
              "id": "rnc-a"
            }
          ],
          "min": 0,
          "max": 100,
          "start": 30,
          "end": 60
        },
        "sockets": [
          {
            "type": "out",
            "id": "rnc-a"
          }
        ],
        "position": {
          "x": 165.8828125,
          "y": 70.99609375
        }
      },
      {
        "type": "console",
        "title": "Log",
        "id": "1539086899378",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "csl-a"
            },
            {
              "type": "out",
              "id": "csl-b"
            }
          ]
        },
        "sockets": [
          {
            "type": "in",
            "id": "csl-a"
          },
          {
            "type": "out",
            "id": "csl-b"
          }
        ],
        "position": {
          "x": 512.328125,
          "y": 43.49609375
        }
      },
      {
        "type": "console",
        "title": "Max Log",
        "id": "1539086907952",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "csl-a"
            },
            {
              "type": "out",
              "id": "csl-b"
            }
          ]
        },
        "sockets": [
          {
            "type": "in",
            "id": "csl-a"
          },
          {
            "type": "out",
            "id": "csl-b"
          }
        ],
        "position": {
          "x": 555.03125,
          "y": 402.56640625
        }
      },
      {
        "type": "console",
        "title": "Min Log",
        "id": "1539086919249",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "csl-a"
            },
            {
              "type": "out",
              "id": "csl-b"
            }
          ]
        },
        "sockets": [
          {
            "type": "in",
            "id": "csl-a"
          },
          {
            "type": "out",
            "id": "csl-b"
          }
        ],
        "position": {
          "x": 566.51171875,
          "y": 150.2578125
        }
      },
      {
        "type": "basic-graph",
        "title": "Baisc Graph",
        "id": "1539087155550",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "bg-a"
            },
            {
              "type": "out",
              "id": "bg-b"
            }
          ]
        },
        "sockets": [
          {
            "type": "in",
            "id": "bg-a"
          },
          {
            "type": "out",
            "id": "bg-b"
          }
        ],
        "position": {
          "x": 747.62890625,
          "y": 354.48828125
        }
      },
      {
        "type": "basic-graph",
        "title": "Baisc Graph",
        "id": "1539087160101",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "bg-a"
            },
            {
              "type": "out",
              "id": "bg-b"
            }
          ]
        },
        "sockets": [
          {
            "type": "in",
            "id": "bg-a"
          },
          {
            "type": "out",
            "id": "bg-b"
          }
        ],
        "position": {
          "x": 731.40234375,
          "y": 5.44921875
        }
      }
    ],
    "connections": [
      {
        "from": "1539086889557",
        "out": "rnc-a",
        "to": "1539086885081",
        "in": "s-a",
        "id": "1539086892699"
      },
      {
        "from": "1539086889557",
        "out": "rnc-a",
        "to": "1539086899378",
        "in": "csl-a",
        "id": "1539086903893"
      },
      {
        "from": "1539086885081",
        "out": "max",
        "to": "1539086907952",
        "in": "csl-a",
        "id": "1539086911501"
      },
      {
        "from": "1539086885081",
        "out": "min",
        "to": "1539086919249",
        "in": "csl-a",
        "id": "1539086922938"
      },
      {
        "from": "1539086907952",
        "out": "csl-b",
        "to": "1539087155550",
        "in": "bg-a",
        "id": "1539087169678"
      },
      {
        "from": "1539086919249",
        "out": "csl-b",
        "to": "1539087160101",
        "in": "bg-a",
        "id": "1539087173356"
      }
    ]
  }
