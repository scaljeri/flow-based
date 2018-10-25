export const basic =
  {
    "id": 1540404926715,
    "children": [
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1540404926716,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 1000,
          "integer": true,
          "integers": true
        },
        "sockets": [
          {
            "type": "out",
            "format": "number",
            "id": 1540404926717
          }
        ],
        "position": {
          "x": 9.142252604166668,
          "y": 22.892260717846458
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1540404926718,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 1000,
          "integer": true,
          "integers": true
        },
        "sockets": [
          {
            "type": "out",
            "format": "number",
            "id": 1540404926719
          }
        ],
        "position": {
          "x": 9.055582682291666,
          "y": 45.97924975074776
        }
      },
      {
        "type": "console",
        "title": "Tap",
        "id": 1540405117631,
        "config": {},
        "sockets": [
          {
            "type": "in",
            "id": 1540405117632,
            "format": "number"
          },
          {
            "type": "out",
            "id": 1540405117633,
            "format": "number"
          }
        ],
        "position": {
          "x": 33.567708333333336,
          "y": 9.603611041874377
        }
      },
      {
        "type": "merge-streams",
        "title": "Merge streams",
        "id": 1540404926720,
        "config": {},
        "sockets": [
          {
            "type": "in",
            "format": "number",
            "id": 1540404926721
          },
          {
            "type": "in",
            "format": "number",
            "id": 1540404926722
          },
          {
            "type": "out",
            "format": "number",
            "id": 1540404926723
          }
        ],
        "position": {
          "x": 43.62670898437501,
          "y": 24.59418619142572
        }
      },
      {
        "type": "console",
        "title": "Tap",
        "id": 1540498125681,
        "config": {},
        "sockets": [
          {
            "type": "in",
            "id": 1540498125682,
            "format": "number"
          },
          {
            "type": "out",
            "id": 1540498125683,
            "format": "number"
          }
        ],
        "position": {
          "x": 57.29553222656251,
          "y": 28.392556704885344
        }
      }
    ],
    "connections": [
      {
        "from": 1540404926716,
        "out": 1540404926717,
        "to": 1540405117631,
        "in": 1540405117632,
        "id": 1540405177804
      },
      {
        "from": 1540404926716,
        "out": 1540404926717,
        "to": 1540404926720,
        "in": 1540404926721,
        "id": 1540405177805
      },
      {
        "from": 1540404926718,
        "out": 1540404926719,
        "to": 1540404926720,
        "in": 1540404926722,
        "id": 1540405177806
      },
      {
        "from": 1540404926720,
        "out": 1540404926723,
        "to": 1540498125681,
        "in": 1540498125682,
        "id": 1540498125684
      }
    ]
  }
