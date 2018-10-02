import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =

  {
    "children": [
      {
        "type": "basic-graoh",
        "state": {},
        "id": "1538487750229",
        "sockets": [
          {
            "type": "in",
            "id": "bg-a"
          }
        ],
        "position": {
          "x": 791.10546875,
          "y": 0
        }
      },
      {
        "type": "random-numbers",
        "state": {},
        "id": "1538487766576",
        "sockets": [
          {
            "type": "in",
            "id": "rnc-a"
          },
          {
            "type": "out",
            "id": "rnc-b"
          },
          {
            "type": "out",
            "id": "rnc-c"
          }
        ],
        "position": {
          "x": 377.765625,
          "y": 236.15625
        }
      },
      {
        "type": "console",
        "state": {},
        "id": "1538487782483",
        "sockets": [
          {
            "type": "in",
            "id": "csl-a"
          }
        ],
        "position": {
          "x": 583.46875,
          "y": 58.8984375
        }
      },
      {
        "type": "console",
        "state": {},
        "id": "1538490206206",
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
          "x": 593.21484375,
          "y": 349.66796875
        }
      },
      {
        "type": "basic-graoh",
        "state": {},
        "id": "1538490213898",
        "sockets": [
          {
            "type": "in",
            "id": "bg-a"
          }
        ],
        "position": {
          "x": 800.3671875,
          "y": 350.18359375
        }
      }
    ],
    "connections": [
      {
        "from": "1538487766576",
        "out": "rnc-b",
        "to": "1538487782483",
        "in": "csl-a"
      },
      {
        "from": "1538487766576",
        "out": "rnc-b",
        "to": "1538487750229",
        "in": "bg-a"
      },
      {
        "from": "1538487766576",
        "out": "rnc-c",
        "to": "1538490206206",
        "in": "csl-a"
      },
      {
        "from": "1538490206206",
        "out": "csl-b",
        "to": "1538490213898",
        "in": "bg-a"
      }
    ]
  }
