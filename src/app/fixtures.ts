export const basic =
  {
    "children": [
      {
        "type": "basic-graph",
        "title": "Basic Graph",
        "id": "1539267000349",
        "config": {
          "sockets": [
            {
              "type": "in",
              "id": "bg-a"
            },
            {
              "type": "out",
              "id": "bg-b"
            }
          ]
        },
        "sockets": [
          {
            "type": "in",
            "id": "bg-a"
          },
          {
            "type": "out",
            "id": "bg-b"
          }
        ],
        "position": {
          "x": 54.44607204861112,
          "y": 43.44383445945947
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": "1539271325765",
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
          "integers": null
        },
        "sockets": [
          {
            "type": "out",
            "id": "rnc-a"
          }
        ],
        "position": {
          "x": 16.684773763020832,
          "y": 33.671641326021934
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": "1539271336926",
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
          "integers": null
        },
        "sockets": [
          {
            "type": "out",
            "id": "rnc-a"
          }
        ],
        "position": {
          "x": 16.696573893229164,
          "y": 46.38272681954138
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
          "x": 16.718105048008784,
          "y": 60.200433106796254
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
          "x": 34.138522677951386,
          "y": 39.18136737103767
        }
      },
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
          "x": 43.88817639686082,
          "y": 41.51032909894072
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
          "columnWidth": 10
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
          "x": 56.59606933593749,
          "y": 23.15328363682069
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
          "x": 16.56331380208334,
          "y": 19.568104895838804
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
      },
      {
        "from": "1539256276787",
        "out": "csl-b",
        "to": "1539267000349",
        "in": "bg-a",
        "id": "1539267006231"
      },
      {
        "from": "1539271325765",
        "out": "rnc-a",
        "to": "1539263443183",
        "in": "ms-a",
        "id": "1539271365169"
      },
      {
        "from": "1539271336926",
        "out": "rnc-a",
        "to": "1539263443183",
        "in": "ms-b",
        "id": "1539271368400"
      }
    ]
  }
