import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =
  {
    "children": [
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": "1538733032358",
        "config": {
          "sockets": [
            {
              "type": "out",
              "id": "rnc-a"
            }
          ]
        }
      },
      {
        "type": "console",
        "title": "Console.log",
        "id": "1538733034592",
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
        "position": {
          "x": 287.51953125,
          "y": 340.96484375
        }
      }
    ],
    "connections": []
  }

