import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =
  {
    "id": "main",
    "children": [
      {
        "type": "basic-graph",
        "title": "Graph Min Values",
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
          "x": 793.87109375,
          "y": 26.7890625
        }
      },
      {
        "type": "basic-graph",
        "title": "Baisc Graph",
        "id": "1539090172921",
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
          "x": 283.296875,
          "y": 447.875
        }
      },
      {
        "type": "console",
        "title": "Log",
        "id": "1539107555190",
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
          "x": 1402.20703125,
          "y": 310.98828125
        }
      },
      {
        "type": "flow",
        "title": "Min / Max Flow",
        "id": "1539090197028",
        "config": {},
        "children": [
          {
            "type": "stats",
            "title": "Statistics",
            "id": "1539090208595",
            "config": {
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
              "x": 356.12890625,
              "y": 152.5703125
            }
          },
          {
            "type": "console",
            "title": "Log",
            "id": "1539090243031",
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
              "x": 1084.27734375,
              "y": 89.6328125
            }
          },
          {
            "type": "console",
            "title": "Log",
            "id": "1539090250313",
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
              "x": 1513.20703125,
              "y": 426.53125
            }
          }
        ],
        "connections": [
          {
            "from": "1539090243031",
            "out": "csl-b",
            "to": "1539090197028",
            "in": "1539090231088",
            "id": "1539090247554"
          },
          {
            "from": "1539090250313",
            "out": "csl-b",
            "to": "1539090197028",
            "in": "1539090224040",
            "id": "1539090255877"
          },
          {
            "from": "1539090208595",
            "out": "max",
            "to": "1539090250313",
            "in": "csl-a",
            "id": "1539090258453"
          },
          {
            "from": "1539090208595",
            "out": "min",
            "to": "1539090243031",
            "in": "csl-a",
            "id": "1539090260705"
          },
          {
            "from": "1539090197028",
            "out": "1539090217389",
            "to": "1539090208595",
            "in": "s-a",
            "id": "1539090263483"
          }
        ],
        "sockets": [
          {
            "type": "out",
            "id": "1539090231088",
            "name": "max",
            "description": null,
            "color": null
          },
          {
            "type": "out",
            "id": "1539090224040",
            "name": "min",
            "description": null,
            "color": null
          },
          {
            "type": "in",
            "id": "1539090217389",
            "name": "dqw",
            "description": null,
            "color": null
          }
        ],
        "position": {
          "x": 437.12890625,
          "y": 157.71484375
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
          "end": 60,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 1000
        },
        "sockets": [
          {
            "type": "out",
            "id": "rnc-a"
          }
        ],
        "position": {
          "x": 96.6796875,
          "y": 76.390625
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
          "x": 48.31640625,
          "y": 366.66796875
        }
      },
      {
        "type": "basic-graph",
        "title": "Graph Max Values",
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
          "x": 922.40625,
          "y": 514.58984375
        }
      }
    ],
    "connections": [
      {
        "from": "1539086889557",
        "out": "rnc-a",
        "to": "1539086899378",
        "in": "csl-a",
        "id": "1539086903893"
      },
      {
        "from": "1539086899378",
        "out": "csl-b",
        "to": "1539090172921",
        "in": "bg-a",
        "id": "1539090176632"
      },
      {
        "from": "1539086889557",
        "out": "rnc-a",
        "to": "1539090197028",
        "in": "1539090217389",
        "id": "1539090275104"
      },
      {
        "from": "1539090197028",
        "out": "1539090231088",
        "to": "1539087160101",
        "in": "bg-a",
        "id": "1539090277478"
      },
      {
        "from": "1539090197028",
        "out": "1539090224040",
        "to": "1539087155550",
        "in": "bg-a",
        "id": "1539090283159"
      },
      {
        "from": "1539087160101",
        "out": "bg-b",
        "to": "1539107555190",
        "in": "csl-a",
        "id": "1539107559342"
      },
      {
        "from": "1539090172921",
        "out": "bg-b",
        "to": "1539107555190",
        "in": "csl-a",
        "id": "1539107565774"
      },
      {
        "from": "1539087155550",
        "out": "bg-b",
        "to": "1539107555190",
        "in": "csl-a",
        "id": "1539107570722"
      }
    ]
  }
