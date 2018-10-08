import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =
  {
    "children": [
      {
        "type": "flow",
        "title": "Composite Unit",
        "id": "1538945395752",
        "config": {},
        "children": [],
        "connections": [],
        "sockets": [],
        "position": {
          "x": 275.98046875,
          "y": 260.81640625
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": "1538991485620",
        "config": {
          "sockets": [
            {
              "type": "out",
              "id": "rnc-a"
            }
          ],
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 1
        },
        "sockets": [
          {
            "type": "out",
            "id": "rnc-a"
          }
        ]
      },
      {
        "type": "console",
        "title": "Log",
        "id": "1538991488870",
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
          "x": 854.20703125,
          "y": 549.69140625
        }
      }
    ],
    "connections": [
      {
        "from": "1538991485620",
        "out": "rnc-a",
        "to": "1538991488870",
        "in": "csl-a",
        "id": "1538991493862"
      }
    ]
  }
