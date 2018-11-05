export const basic =
  {
    "id": 1541436624265,
    "children": [
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1541436624269,
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
            "id": 1541436624270
          }
        ],
        "position": {
          "x": 22.068074544270836,
          "y": 36.89867896311067
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1541436624266,
        "config": {
          "expanded": true
        },
        "sockets": [
          {
            "type": "in",
            "id": 1541436624267
          },
          {
            "type": "out",
            "id": 1541436624268
          }
        ],
        "position": {
          "x": 41.12874348958332,
          "y": 18.923308200398797
        }
      }
    ],
    "connections": []
  }
