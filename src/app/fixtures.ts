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
          "expanded": false
        },
        "sockets": [
          {
            "type": "in",
            "id": 1541436624267,
            "format": "number"
          },
          {
            "type": "out",
            "id": 1541436624268,
            "format": "number"
          }
        ],
        "position": {
          "x": 41.12874348958332,
          "y": 18.923308200398797
        }
      },
      {
        "type": "merge-streams",
        "title": "Merge streams",
        "id": 1541449971440,
        "config": {},
        "sockets": [
          {
            "type": "in",
            "format": "number",
            "id": 1541449971441
          },
          {
            "type": "in",
            "format": "number",
            "id": 1541449971442
          },
          {
            "type": "out",
            "format": "number",
            "id": 1541449971443
          }
        ],
        "position": {
          "x": 62.03735351562501,
          "y": 33.60893880857427
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1541449971446,
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
            "id": 1541449971447
          }
        ],
        "position": {
          "x": 22.260335286458336,
          "y": 52.60040191924227
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1541449971449,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "type": "in",
            "id": 1541449971450,
            "format": "number"
          },
          {
            "type": "out",
            "id": 1541449971451,
            "format": "number"
          }
        ],
        "position": {
          "x": 81.16414388020833,
          "y": 18.74961054336989
        }
      }
    ],
    "connections": [
      {
        "from": 1541449971440,
        "out": 1541449971443,
        "to": 1541449971449,
        "in": 1541449971450,
        "id": 1541449971452
      },
      {
        "from": 1541449971446,
        "out": 1541449971447,
        "to": 1541449971440,
        "in": 1541449971442,
        "id": 1541449971448
      },
      {
        "from": 1541436624266,
        "out": 1541436624268,
        "to": 1541449971440,
        "in": 1541449971441,
        "id": 1541449971445
      },
      {
        "from": 1541436624269,
        "out": 1541436624270,
        "to": 1541436624266,
        "in": 1541436624267,
        "id": 1541449971444
      }
    ]
  }
