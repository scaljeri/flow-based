export const basic =
  {
    "children": [
      {
        "type": "console",
        "title": "Log",
        "id": "1539256276787",
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
          "x": 43.59073173540249,
          "y": 30.87271070412517
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": "1539256273798",
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
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 100,
          "integers": false
        },
        "sockets": [
          {
            "type": "out",
            "id": "rnc-a"
          }
        ],
        "position": {
          "x": 18.48527627196712,
          "y": 55.72323968705547
        }
      },
      {
        "type": "stats",
        "title": "Statistics",
        "id": "1539259981443",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "s-a"
            },
            {
              "type": "out",
              "id": "min",
              "name": "Min value"
            },
            {
              "type": "out",
              "id": "max",
              "name": "Max value"
            }
          ],
          "columnWidth": 1
        },
        "sockets": [
          {
            "type": "in",
            "id": "s-a"
          },
          {
            "type": "out",
            "id": "min",
            "name": "Min value"
          },
          {
            "type": "out",
            "id": "max",
            "name": "Max value"
          }
        ],
        "position": {
          "x": 59.027506510416664,
          "y": 30.44430120910384
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": "1539263437503",
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
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 100,
          "integer": true,
          "integers": false
        },
        "sockets": [
          {
            "type": "out",
            "id": "rnc-a"
          }
        ],
        "position": {
          "x": 16.88151041666667,
          "y": 19.469572368421055
        }
      },
      {
        "type": "merge-streams",
        "title": "Merge streams",
        "id": "1539263443183",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "ms-a"
            },
            {
              "type": "in",
              "id": "ms-b"
            },
            {
              "type": "out",
              "id": "ms-c",
              "name": "Min value"
            }
          ]
        },
        "sockets": [
          {
            "type": "in",
            "id": "ms-a"
          },
          {
            "type": "in",
            "id": "ms-b"
          },
          {
            "type": "out",
            "id": "ms-c",
            "name": "Min value"
          }
        ],
        "position": {
          "x": 29.405110677083332,
          "y": 34.91676298008535
        }
      }
    ],
    "connections": [
      {
        "from": "1539256276787",
        "out": "csl-b",
        "to": "1539259981443",
        "in": "s-a",
        "id": "1539259984410"
      },
      {
        "from": "1539263443183",
        "out": "ms-c",
        "to": "1539256276787",
        "in": "csl-a",
        "id": "1539263446030"
      },
      {
        "from": "1539263437503",
        "out": "rnc-a",
        "to": "1539263443183",
        "in": "ms-a",
        "id": "1539263448201"
      },
      {
        "from": "1539256273798",
        "out": "rnc-a",
        "to": "1539263443183",
        "in": "ms-b",
        "id": "1539263450306"
      }
    ]
  }
