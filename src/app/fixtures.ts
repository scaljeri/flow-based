export const basic =
  {
    "id": 1,
    "children": [
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
          "x": 22.979532877604168,
          "y": 43.92564494017946
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
          "x": 22.878824869791668,
          "y": 23.05427467597209
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
          "x": 35.556844075520836,
          "y": 33.32113035892323
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 12,
        "config": {
          "expanded": false
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
          "x": 47.76123046875,
          "y": 35.619703389830505
        }
      },
      {
        "type": "stats",
        "title": "Statistics",
        "id": 16,
        "config": {
          "columnWidth": 1
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
          "x": 58.86311848958333,
          "y": 34.1814400548355
        }
      }
    ],
    "connections": [
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

