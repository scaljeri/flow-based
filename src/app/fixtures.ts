export const basic =
  {
    "id": 1542057173568,
    "children": [
      {
        "type": "tap",
        "title": "Tap",
        "id": 1542125048424,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1542125048425,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1542125048426,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 40.8074951171875,
          "y": 28.703343095712867
        }
      },
      {
        "type": "stats",
        "title": "Statistics",
        "id": 1542140574654,
        "config": {
          "columnWidth": 1
        },
        "sockets": [
          {
            "id": 1542140574655,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1542140574656,
            "type": "out",
            "name": "Min value",
            "format": "number"
          },
          {
            "id": 1542140574657,
            "type": "out",
            "name": "Max value",
            "format": "number"
          }
        ],
        "position": {
          "x": 54.550577799479164,
          "y": 33.40953701395812
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1542140574648,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 3000,
          "integer": true,
          "integers": true
        },
        "sockets": [
          {
            "id": 1542140574649,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 5.547349717881943,
          "y": 18.116760139212516
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1542140574651,
        "config": {
          "min": 0,
          "max": 100,
          "start": 0,
          "end": 100,
          "intervalMax": 10000,
          "intervalMin": 100,
          "interval": 3200,
          "integer": true,
          "integers": true
        },
        "sockets": [
          {
            "id": 1542140574652,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 4.334106445312502,
          "y": 39.580087861415755
        }
      },
      {
        "type": "flow",
        "title": "Composite Unit",
        "id": 1542057173569,
        "config": {},
        "sockets": [
          {
            "type": "in",
            "name": "dfb",
            "description": null,
            "color": null,
            "id": 1542140600722,
            "format": "number"
          },
          {
            "type": "out",
            "name": "sa",
            "description": null,
            "color": null,
            "id": 1542140451388,
            "format": "number"
          },
          {
            "type": "in",
            "name": "as",
            "description": null,
            "color": null,
            "id": 1542138850863,
            "format": "number"
          }
        ],
        "children": [
          {
            "type": "merge-streams",
            "title": "Merge streams",
            "id": 1542140574641,
            "config": {},
            "sockets": [
              {
                "id": 1542140574642,
                "type": "in",
                "format": "number"
              },
              {
                "id": 1542140574643,
                "type": "in",
                "format": "number"
              },
              {
                "id": 1542140574644,
                "type": "out",
                "format": "number"
              }
            ],
            "position": {
              "x": 19.285878413865547,
              "y": 42.98533872598585
            }
          },
          {
            "type": "tap",
            "title": "Tap",
            "id": 1542125048417,
            "config": {
              "expanded": true
            },
            "sockets": [
              {
                "id": 1542125048418,
                "type": "in",
                "format": "number"
              },
              {
                "id": 1542125048419,
                "type": "out",
                "format": "number"
              }
            ],
            "position": {
              "x": 52.45769768902457,
              "y": 9.460201430386288
            }
          }
        ],
        "connections": [
          {
            "from": 1542140574641,
            "out": 1542140574644,
            "to": 1542125048417,
            "in": 1542125048418,
            "id": 1542140574647
          },
          {
            "from": 1542057173569,
            "out": 1542138850863,
            "to": 1542140574641,
            "in": 1542140574643,
            "id": 1542140574646
          },
          {
            "from": 1542057173569,
            "out": 1542140600722,
            "to": 1542140574641,
            "in": 1542140574642,
            "id": 1542140574645
          },
          {
            "from": 1542125048417,
            "out": 1542125048419,
            "to": 1542057173569,
            "in": 1542140451388,
            "id": 1542125048423
          }
        ],
        "position": {
          "x": 25.658559647817466,
          "y": 24.59769130109671
        }
      },
      {
        "type": "merge-streams",
        "title": "Merge streams",
        "id": 1542186201697,
        "config": {},
        "sockets": [
          {
            "id": 1542186201698,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1542186201699,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1542186201700,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 57.63129340277777,
          "y": 6.368354374110954
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1542186390563,
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
            "id": 1542186390564,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 36.840549045138886,
          "y": 2.5237820056899025
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1542186390566,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1542186390567,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1542186390568,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 74.23421223958333,
          "y": 8.944367887624468
        }
      }
    ],
    "connections": [
      {
        "from": 1542186201697,
        "out": 1542186201700,
        "to": 1542186390566,
        "in": 1542186390567,
        "id": 1542186390569
      },
      {
        "from": 1542186390563,
        "out": 1542186390564,
        "to": 1542186201697,
        "in": 1542186201699,
        "id": 1542186390565
      },
      {
        "from": 1542125048424,
        "out": 1542125048426,
        "to": 1542186201697,
        "in": 1542186201698,
        "id": 1542186390562
      },
      {
        "from": 1542125048424,
        "out": 1542125048426,
        "to": 1542140574654,
        "in": 1542140574655,
        "id": 1542140574658
      },
      {
        "from": 1542140574651,
        "out": 1542140574652,
        "to": 1542057173569,
        "in": 1542138850863,
        "id": 1542140574653
      },
      {
        "from": 1542140574648,
        "out": 1542140574649,
        "to": 1542057173569,
        "in": 1542140600722,
        "id": 1542140574650
      },
      {
        "to": 1542125048424,
        "in": 1542125048425,
        "from": 1542057173569,
        "out": 1542140451388,
        "id": 1542125048427
      }
    ]
  }
