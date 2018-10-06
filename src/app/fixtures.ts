import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =
  {
    "children": [
      {
        "type": "flow",
        "title": "Composite Unit",
        "id": "1538746723617",
        "config": {},
        "children": [
          {
            "type": "console",
            "title": "Log",
            "id": "1538746765966",
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
              "x": 450.48828125,
              "y": 436.6875
            }
          },
          {
            "type": "random-numbers",
            "title": "Random number generator",
            "id": "1538747710227",
            "config": {
              "sockets": [
                {
                  "type": "out",
                  "id": "rnc-a"
                }
              ]
            },
            "sockets": [
              {
                "type": "out",
                "id": "rnc-a"
              }
            ],
            "position": {
              "x": 419.64453125,
              "y": 244.90625
            }
          }
        ],
        "connections": [],
        "sockets": [
          {
            "type": "out",
            "id": "1538747712749"
          },
          {
            "type": "in",
            "id": "1538746751701"
          }
        ],
        "position": {
          "x": 352.0078125,
          "y": 282.91015625
        }
      },
      {
        "type": "console",
        "title": "Log",
        "id": "1538747720255",
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
          "x": 523.12890625,
          "y": 300.51171875
        }
      }
    ],
    "connections": []
  }
