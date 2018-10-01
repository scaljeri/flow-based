import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =
{
  "children": [
  {
    "type": "random-numbers",
    "state": {},
    "id": "1538393253483",
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
      "x": 128.90625,
      "y": 173.046875
    }
  },
  {
    "type": "random-numbers",
    "state": {},
    "id": "1538393256972",
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
      "x": 713.92578125,
      "y": 566.546875
    }
  },
  {
    "type": "default",
    "state": {},
    "id": "1538393361621",
    "children": [
      {
        "type": "random-numbers",
        "state": {},
        "id": "1538393372016",
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
          "x": 432.68359375,
          "y": 285.89453125
        }
      },
      {
        "type": "default",
        "state": {},
        "id": "1538393395260",
        "children": [
          {
            "type": "random-numbers",
            "state": {},
            "id": "1538393403911",
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
              "x": 596.01953125,
              "y": 36.78125
            }
          }
        ],
        "connections": [
          {
            "from": "1538393395260",
            "out": "1538393397848",
            "to": "1538393403911",
            "in": "rnc-a"
          },
          {
            "from": "1538393403911",
            "out": "rnc-b",
            "to": "1538393395260",
            "in": "1538393399770"
          }
        ],
        "sockets": [
          {
            "type": "out",
            "id": "1538393399770"
          },
          {
            "type": "in",
            "id": "1538393397848"
          }
        ],
        "position": {
          "x": 911.8671875,
          "y": 154.23046875
        }
      }
    ],
    "connections": [
      {
        "from": "1538393361621",
        "out": "1538393366190",
        "to": "1538393372016",
        "in": "rnc-a"
      },
      {
        "from": "1538393372016",
        "out": "rnc-b",
        "to": "1538393395260",
        "in": "1538393397848"
      },
      {
        "from": "1538393395260",
        "out": "1538393399770",
        "to": "1538393361621",
        "in": "1538393368372"
      },
      {
        "from": "1538393372016",
        "out": "rnc-c",
        "to": "1538393361621-fake",
        "in": "1538393361621-fake"
      }
    ],
    "sockets": [
      {
        "type": "out",
        "id": "1538393368372"
      },
      {
        "type": "in",
        "id": "1538393366190"
      }
    ],
    "position": {
      "x": 1141.640625,
      "y": 41.81640625
    }
  }
],
  "connections": [
  {
    "from": "1538393253483",
    "out": "rnc-c",
    "to": "1538393256972",
    "in": "rnc-a"
  },
  {
    "from": "1538393256972",
    "out": "rnc-b",
    "to": "1538393253483",
    "in": "rnc-a"
  },
  {
    "from": "1538393253483",
    "out": "rnc-b",
    "to": "1538393361621",
    "in": "1538393366190"
  },
  {
    "from": "1538393361621",
    "out": "1538393368372",
    "to": "1538393256972",
    "in": "rnc-a"
  }
]
}
