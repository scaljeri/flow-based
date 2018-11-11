export const basic =
  {
    "id": 1,
    "children": [
      {
        "type": "tap",
        "title": "Tap",
        "id": 12,
        "config": {
          "expanded": true
        },
        "sockets": [
          {
            "id": 13,
            "type": "in",
            "format": "number"
          },
          {
            "id": 14,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 22.509562174479175,
          "y": 45.157885717846455
        }
      },
      {
        "type": "basic-graph",
        "title": "Basic Graph",
        "id": 1541966393414,
        "config": {},
        "sockets": [
          {
            "id": 1541966393415,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1541966393416,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 57.669881184895836,
          "y": 53.711521684945154
        }
      },
      {
        "type": "merge-streams",
        "title": "Merge streams",
        "id": 6,
        "config": {},
        "sockets": [
          {
            "id": 7,
            "type": "in",
            "format": "number"
          },
          {
            "id": 8,
            "type": "in",
            "format": "number"
          },
          {
            "id": 9,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 12.86946614583333,
          "y": 58.052794740777664
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 4,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 100,
          "integer": true,
          "integers": true
        },
        "sockets": [
          {
            "id": 5,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 3.468017578124999,
          "y": 38.99317671984047
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 2,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 100,
          "integer": true,
          "integers": true
        },
        "sockets": [
          {
            "id": 3,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 13.695068359375005,
          "y": 30.90961490528415
        }
      },
      {
        "type": "stats",
        "title": "Statistics",
        "id": 16,
        "config": {
          "columnWidth": 1,
          "expanded": true
        },
        "sockets": [
          {
            "id": 17,
            "type": "in",
            "format": "number"
          },
          {
            "id": 18,
            "type": "out",
            "name": "Min value",
            "format": "number"
          },
          {
            "id": 19,
            "type": "out",
            "name": "Max value",
            "format": "number"
          }
        ],
        "position": {
          "x": 49.069620768229164,
          "y": 6.098501370887348
        }
      }
    ],
    "connections": [
      {
        "from": 12,
        "out": 14,
        "to": 1541966393414,
        "in": 1541966393415,
        "id": 1541966393417
      },
      {
        "from": 12,
        "out": 14,
        "to": 16,
        "in": 17,
        "id": 20
      },
      {
        "from": 6,
        "out": 9,
        "to": 12,
        "in": 13,
        "id": 15
      },
      {
        "from": 4,
        "out": 5,
        "to": 6,
        "in": 8,
        "id": 11
      },
      {
        "from": 2,
        "out": 3,
        "to": 6,
        "in": 7,
        "id": 10
      }
    ]
  }
