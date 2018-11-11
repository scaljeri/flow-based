export const basic =
  {
    "id": 1541970705785,
    "children": [
      {
        "type": "tap",
        "title": "Tap",
        "id": 1541970814514,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1541970814515,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1541970814516,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 48.39599609375,
          "y": 23.888490777666995
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1541970705794,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 99.7,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 100,
          "integer": true,
          "integers": true
        },
        "sockets": [
          {
            "id": 1541970705795,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 4.12109375,
          "y": 17.462456380857418
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1541970814518,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1541970814519,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1541970814520,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 25.99609375,
          "y": 9.754330757726821
        }
      },
      {
        "type": "flow",
        "title": "Composite Unit",
        "id": 1541970705786,
        "config": {},
        "sockets": [
          {
            "id": 1541970705788,
            "type": "in",
            "name": "in",
            "description": null,
            "color": null,
            "format": "number"
          },
          {
            "id": 1541970705787,
            "type": "out",
            "name": "out",
            "description": null,
            "color": null,
            "format": "number"
          }
        ],
        "children": [
          {
            "type": "tap",
            "title": "Tap",
            "id": 1541970705789,
            "config": {
              "expanded": false
            },
            "sockets": [
              {
                "id": 1541970705790,
                "type": "in",
                "format": "number"
              },
              {
                "id": 1541970705791,
                "type": "out",
                "format": "number"
              }
            ],
            "position": {
              "x": 43.68668895656779,
              "y": 47.68547775530838
            }
          }
        ],
        "connections": [
          {
            "from": 1541970705789,
            "out": 1541970705791,
            "to": 1541970705786,
            "in": 1541970705787,
            "id": 1541970705793
          },
          {
            "from": 1541970705786,
            "out": 1541970705788,
            "to": 1541970705789,
            "in": 1541970705790,
            "id": 1541970705792
          }
        ],
        "position": {
          "x": 25.478922526041668,
          "y": 44.15581380857429
        }
      }
    ],
    "connections": [
      {
        "from": 1541970705794,
        "out": 1541970705795,
        "to": 1541970814518,
        "in": 1541970814519,
        "id": 1541970814521
      },
      {
        "from": 1541970705786,
        "out": 1541970705787,
        "to": 1541970814514,
        "in": 1541970814515,
        "id": 1541970814517
      },
      {
        "from": 1541970705794,
        "out": 1541970705795,
        "to": 1541970705786,
        "in": 1541970705788,
        "id": 1541970705796
      }
    ]
  }
