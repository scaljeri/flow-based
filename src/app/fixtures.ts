export const basic = {
  "id": 1540846139872,
  "children": [
    {
      "type": "stats",
      "title": "Statistics",
      "id": 1540846679094,
      "config": {
        "columnWidth": 7.3
      },
      "sockets": [
        {
          "type": "in",
          "format": "number",
          "id": 1540846679095
        },
        {
          "type": "out",
          "name": "Min value",
          "format": "number",
          "id": 1540846679096
        },
        {
          "type": "out",
          "name": "Max value",
          "format": "number",
          "id": 1540846679097
        }
      ],
      "position": {
        "x": 70.69061832977589,
        "y": 63.164802467597205
      }
    },
    {
      "type": "tap",
      "title": "Tap",
      "id": 1540846679098,
      "config": {},
      "sockets": [
        {
          "type": "in",
          "id": 1540846679099,
          "format": "number"
        },
        {
          "type": "out",
          "id": 1540846679100,
          "format": "number"
        }
      ],
      "position": {
        "x": 54.67457644076841,
        "y": 63.7240621884347
      }
    },
    {
      "type": "random-numbers",
      "title": "Random number generator",
      "id": 1540846679105,
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
          "type": "out",
          "format": "number",
          "id": 1540846679106
        }
      ],
      "position": {
        "x": 9.221167956243331,
        "y": 61.93334060319043
      }
    },
    {
      "type": "random-numbers",
      "title": "Random number generator",
      "id": 1540846679107,
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
          "type": "out",
          "format": "number",
          "id": 1540846679108
        }
      ],
      "position": {
        "x": 9.250767075773744,
        "y": 75.11917372881355
      }
    },
    {
      "type": "random-numbers",
      "title": "Random number generator",
      "id": 1540846139873,
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
          "type": "out",
          "format": "number",
          "id": 1540846139874
        }
      ],
      "position": {
        "x": 7.232607390608324,
        "y": 5.9419398055832495
      }
    },
    {
      "type": "random-numbers",
      "title": "Random number generator",
      "id": 1540846139875,
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
          "type": "out",
          "format": "number",
          "id": 1540846139876
        }
      ],
      "position": {
        "x": 7.299726520811101,
        "y": 24.984811191425727
      }
    },
    {
      "type": "random-numbers",
      "title": "Random number generator",
      "id": 1540846679103,
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
          "type": "out",
          "format": "number",
          "id": 1540846679104
        }
      ],
      "position": {
        "x": 9.302044423692637,
        "y": 47.752445787637086
      }
    },
    {
      "type": "flow",
      "title": "Composite Unit",
      "id": 1540846679083,
      "config": {},
      "children": [
        {
          "type": "merge-streams",
          "title": "Merge streams",
          "id": 1540846679087,
          "config": {},
          "sockets": [
            {
              "type": "in",
              "format": "number",
              "id": 1540846679088
            },
            {
              "type": "in",
              "format": "number",
              "id": 1540846679089
            },
            {
              "type": "out",
              "format": "number",
              "id": 1540846679090
            }
          ],
          "position": {
            "x": 29.740940553745926,
            "y": 44.33929474216381
          }
        }
      ],
      "connections": [
        {
          "from": 1540846679087,
          "out": 1540846679090,
          "to": 1540846679083,
          "in": 1540846679085,
          "id": 1540846679093
        },
        {
          "from": 1540846679083,
          "out": 1540846679084,
          "to": 1540846679087,
          "in": 1540846679089,
          "id": 1540846679092
        },
        {
          "from": 1540846679083,
          "out": 1540846679086,
          "to": 1540846679087,
          "in": 1540846679088,
          "id": 1540846679091
        }
      ],
      "sockets": [
        {
          "id": 1540846679086,
          "type": "in",
          "name": "inin",
          "description": null,
          "color": null,
          "format": "number"
        },
        {
          "id": 1540846679085,
          "type": "out",
          "name": "out",
          "description": null,
          "color": null,
          "format": "number"
        },
        {
          "id": 1540846679084,
          "type": "in",
          "name": "in",
          "description": null,
          "color": null,
          "format": "number"
        }
      ],
      "position": {
        "x": 33.44575440234792,
        "y": 61.85350199401796
      }
    },
    {
      "type": "merge-streams",
      "title": "Merge streams",
      "id": 1540846139877,
      "config": {},
      "sockets": [
        {
          "type": "in",
          "format": "number",
          "id": 1540846139878
        },
        {
          "type": "in",
          "format": "number",
          "id": 1540846139879
        },
        {
          "type": "out",
          "format": "number",
          "id": 1540846139880
        }
      ],
      "position": {
        "x": 27.247031750266807,
        "y": 6.4225292871385875
      }
    },
    {
      "type": "tap",
      "title": "Tap",
      "id": 1540846139887,
      "config": {},
      "sockets": [
        {
          "type": "in",
          "id": 1540846139888,
          "format": "number"
        },
        {
          "type": "out",
          "id": 1540846139889,
          "format": "number"
        }
      ],
      "position": {
        "x": 43.240561632870865,
        "y": 6.573249002991025
      }
    },
    {
      "type": "stats",
      "title": "Statistics",
      "id": 1540846139883,
      "config": {
        "columnWidth": 1
      },
      "sockets": [
        {
          "type": "in",
          "format": "number",
          "id": 1540846139884
        },
        {
          "type": "out",
          "name": "Min value",
          "format": "number",
          "id": 1540846139885
        },
        {
          "type": "out",
          "name": "Max value",
          "format": "number",
          "id": 1540846139886
        }
      ],
      "position": {
        "x": 67.84076507470651,
        "y": 7.512618394815558
      }
    },
    {
      "type": "basic-graph",
      "title": "Basic Graph",
      "id": 1540846982356,
      "config": {},
      "sockets": [
        {
          "type": "in",
          "format": "number",
          "id": 1540846982357
        },
        {
          "type": "out",
          "format": "number",
          "id": 1540846982358
        }
      ],
      "position": {
        "x": 44.99941635538954,
        "y": 20.768553713858424
      }
    }
  ],
  "connections": [
    {
      "from": 1540846139887,
      "out": 1540846139889,
      "to": 1540846982356,
      "in": 1540846982357,
      "id": 1540846982359
    },
    {
      "from": 1540846679103,
      "out": 1540846679104,
      "to": 1540846679083,
      "in": 1540846679086,
      "id": 1540846679111
    },
    {
      "from": 1540846679105,
      "out": 1540846679106,
      "to": 1540846679083,
      "in": 1540846679086,
      "id": 1540846679110
    },
    {
      "from": 1540846679107,
      "out": 1540846679108,
      "to": 1540846679083,
      "in": 1540846679084,
      "id": 1540846679109
    },
    {
      "from": 1540846679083,
      "out": 1540846679085,
      "to": 1540846679098,
      "in": 1540846679099,
      "id": 1540846679102
    },
    {
      "from": 1540846679098,
      "out": 1540846679100,
      "to": 1540846679094,
      "in": 1540846679095,
      "id": 1540846679101
    },
    {
      "from": 1540846139887,
      "out": 1540846139889,
      "to": 1540846139883,
      "in": 1540846139884,
      "id": 1540846139891
    },
    {
      "from": 1540846139877,
      "out": 1540846139880,
      "to": 1540846139887,
      "in": 1540846139888,
      "id": 1540846139890
    },
    {
      "from": 1540846139875,
      "out": 1540846139876,
      "to": 1540846139877,
      "in": 1540846139879,
      "id": 1540846139882
    },
    {
      "from": 1540846139873,
      "out": 1540846139874,
      "to": 1540846139877,
      "in": 1540846139878,
      "id": 1540846139881
    }
  ]
}
