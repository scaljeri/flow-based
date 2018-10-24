export const basic =
  {
    "id": 1540385698676,
    "children": [
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1540385698677,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 1,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 1000,
          "integer": true
        },
        "sockets": [
          {
            "type": "out",
            "format": "number",
            "id": 1540385698678
          }
        ],
        "position": {
          "x": 21.046549479166668,
          "y": 34.07550231152205
        }
      },
      {
        "type": "console",
        "title": "Tap",
        "id": 1540385698679,
        "config": {},
        "sockets": [
          {
            "type": "in",
            "id": 1540385698680,
            "format": "number"
          },
          {
            "type": "out",
            "id": 1540385698681,
            "format": "number"
          }
        ],
        "position": {
          "x": 38.69086371527777,
          "y": 37.853396159317214
        }
      }
    ],
    "connections": [
      {
        "from": 1540385698677,
        "out": 1540385698678,
        "to": 1540385698679,
        "in": 1540385698680,
        "id": 1540385698682
      }
    ]
  }
