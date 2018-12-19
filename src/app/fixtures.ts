export const basic =
  {
    "id": 1545251591951,
    "children": [
      {
        "type": "stats",
        "title": "Statistics",
        "id": 1545251591967,
        "config": {
          "columnWidth": 1,
          "expanded": true
        },
        "sockets": [
          {
            "id": 1545251591968,
            "type": "in",
            "format": "number",
            "color": "#fff100"
          },
          {
            "id": 1545251591969,
            "type": "out",
            "aux": "min",
            "name": "Min valuex",
            "format": "number",
            "color": "#1b06f7"
          },
          {
            "id": 1545251591970,
            "type": "out",
            "aux": "max",
            "name": "Max value",
            "format": "number",
            "color": "#f50530"
          }
        ],
        "position": {
          "x": 19.34041341145832,
          "y": 39.9045052342971
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1545251591980,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545251591981,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1545251591982,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 83.94368489583331,
          "y": 13.937873878364908
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1545251591983,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545251591984,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1545251591985,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 85.25390625,
          "y": 36.243612911266204
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1545251591956,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 1000,
          "integer": true,
          "expanded": false,
          "integers": true
        },
        "sockets": [
          {
            "id": 1545251591957,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 7.542724609375002,
          "y": 3.255857427716851
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1545251591958,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 1000,
          "integer": true,
          "expanded": false,
          "integers": true
        },
        "sockets": [
          {
            "id": 1545251591959,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 8.048502604166673,
          "y": 18.325881729810565
        }
      },
      {
        "type": "merge-streams",
        "title": "Merge streams",
        "id": 1545251591952,
        "config": {},
        "sockets": [
          {
            "id": 1545251591953,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1545251591954,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1545251591955,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 34.77091471354166,
          "y": 5.413447158524431
        }
      }
    ],
    "connections": [
      {
        "from": 1545251591967,
        "out": 1545251591970,
        "to": 1545251591983,
        "in": 1545251591984,
        "id": 1545251591987
      },
      {
        "from": 1545251591967,
        "out": 1545251591969,
        "to": 1545251591980,
        "in": 1545251591981,
        "id": 1545251591986
      },
      {
        "from": 1545251591952,
        "out": 1545251591955,
        "to": 1545251591967,
        "in": 1545251591968,
        "id": 1545251591971
      },
      {
        "from": 1545251591958,
        "out": 1545251591959,
        "to": 1545251591952,
        "in": 1545251591954,
        "id": 1545251591961
      },
      {
        "from": 1545251591956,
        "out": 1545251591957,
        "to": 1545251591952,
        "in": 1545251591953,
        "id": 1545251591960
      }
    ]
  }

