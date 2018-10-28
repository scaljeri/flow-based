export const basic =
  {
    "id": 1540554017332,
    "children": [
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1540554236759,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 5400,
          "integer": true,
          "integers": true
        },
        "sockets": [
          {
            "type": "out",
            "format": "number",
            "id": 1540554236760
          }
        ],
        "position": {
          "x": 18.190714518229164,
          "y": 11.657737169126793
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1540554236761,
        "config": {},
        "sockets": [
          {
            "type": "in",
            "id": 1540554236762,
            "format": null
          },
          {
            "type": "out",
            "id": 1540554236763,
            "format": null
          }
        ],
        "position": {
          "x": 45.275065104166664,
          "y": 14.179726445663011
        }
      },
      {
        "type": "stats",
        "title": "Statistics",
        "id": 1540742912781,
        "config": {
          "columnWidth": 1
        },
        "sockets": [
          {
            "type": "in",
            "format": "numberx",
            "id": 1540742912782
          },
          {
            "type": "out",
            "name": "Min value",
            "format": "number",
            "id": 1540742912783
          },
          {
            "type": "out",
            "name": "Max value",
            "format": "number",
            "id": 1540742912784
          }
        ],
        "position": {
          "x": 66.75577799479167,
          "y": 24.694666001994015
        }
      },
      {
        "type": "flow",
        "title": "Composite Unit",
        "id": 1540554017333,
        "config": {},
        "children": [
          {
            "type": "stats",
            "title": "Statistics",
            "id": 1540578394670,
            "config": {
              "columnWidth": 1
            },
            "sockets": [
              {
                "type": "in",
                "format": "numberx",
                "id": 1540578394671
              },
              {
                "type": "out",
                "name": "Min value",
                "format": "number",
                "id": 1540578394672
              },
              {
                "type": "out",
                "name": "Max value",
                "format": "number",
                "id": 1540578394673
              }
            ],
            "position": {
              "x": 60.57542703919491,
              "y": 26.10289228723405
            }
          },
          {
            "type": "tap",
            "title": "Tap",
            "id": 1540557099928,
            "config": {},
            "sockets": [
              {
                "type": "in",
                "id": 1540557099929
              },
              {
                "type": "out",
                "id": 1540557099930
              }
            ],
            "position": {
              "x": 46.67182534427966,
              "y": 43.58964231547018
            }
          }
        ],
        "connections": [
          {
            "from": 1540557099928,
            "out": 1540557099930,
            "to": 1540554017333,
            "in": 1540572399316,
            "id": 1540742912787
          },
          {
            "to": 1540557099928,
            "in": 1540557099929,
            "from": 1540554017333,
            "out": 1540554512369,
            "id": 1540742912786
          }
        ],
        "sockets": [
          {
            "id": 1540572399316,
            "type": "out",
            "name": "out",
            "description": null,
            "color": null
          },
          {
            "id": 1540554512369,
            "type": "in",
            "name": "in",
            "description": null,
            "color": null
          }
        ],
        "position": {
          "x": 38.295084635416664,
          "y": 32.18196971585243
        }
      }
    ],
    "connections": []
  }
