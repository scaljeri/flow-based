export const basic =
  {
    "id": 1539945982937,
    "children": [
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1539945982938,
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
            "id": 1539945982939,
            "format": "number",
          }
        ],
        "position": {
          "x": 30.77880859375,
          "y": 32.57301298008535
        }
      },
      {
        "type": "stats",
        "title": "Statistics",
        "id": 1539985263701,
        "config": {
          "columnWidth": 1
        },
        "sockets": [
          {
            "type": "in",
            "format": "number",
            "id": 1539985263702
          },
          {
            "type": "out",
            "name": "Min value",
            "format": "number",
            "id": 1539985263703
          },
          {
            "type": "out",
            "name": "Max value",
            "format": "number",
            "id": 1539985263704
          }
        ],
        "position": {
          "x": 51.20279947916666,
          "y": 44.51138771186441
        }
      }
    ],
    "connections": []
  }
