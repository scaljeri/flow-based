export const basic =
  {
    "id": 1545405065115,
    "children": [
      {
        "type": "tap",
        "title": "Tap",
        "id": 1545405065121,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545405065122,
            "type": "in"
          },
          {
            "id": 1545405065123,
            "type": "out"
          }
        ],
        "position": {
          "x": 62.574666341145836,
          "y": 49.6615621884347
        }
      },
      {
        "type": "custom",
        "title": "Dynamic stuff",
        "id": 1545405065116,
        "config": {
          "func": "out.next(val)",
          "expanded": true
        },
        "sockets": [
          {
            "id": 1545405065117,
            "type": "in"
          },
          {
            "id": 1545405065118,
            "type": "out"
          }
        ],
        "position": {
          "x": 34.76806640624999,
          "y": 26.403991151545366
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1545405065119,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 1000,
          "integer": true,
          "expanded": false,
          "integers": true
        },
        "sockets": [
          {
            "id": 1545405065120,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 22.035522460937504,
          "y": 48.33896747258225
        }
      }
    ],
    "connections": [
      {
        "to": 1545405065116,
        "in": 1545405065117,
        "from": 1545405065119,
        "out": 1545405065120,
        "id": 1545405065125
      },
      {
        "to": 1545405065121,
        "in": 1545405065122,
        "from": 1545405065116,
        "out": 1545405065118,
        "id": 1545405065124
      }
    ]
  }
