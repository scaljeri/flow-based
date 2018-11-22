export const basic =
  {
    "id": 1542057173568,
    "children": [
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
          "interval": 100,
          "integer": true,
          "integers": true,
          "expanded": false
        },
        "sockets": [
          {
            "id": 1542140574652,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 4.616767035590273,
          "y": 21.51132008047692
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
          "interval": 100,
          "integer": true,
          "integers": true,
          "expanded": false
        },
        "sockets": [
          {
            "id": 1542140574649,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 16.661173502604157,
          "y": 6.967000181886753
        }
      },
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
          "x": 39.25069173177083,
          "y": 18.242038863849427
        }
      },
      {
        "type": "stats",
        "title": "Statistics",
        "id": 1542140574654,
        "config": {
          "columnWidth": 1,
          "expanded": true
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
          "x": 61.28479003906251,
          "y": 2.161759631312318
        }
      },
      {
        "type": "basic-graph",
        "title": "Basic Graph",
        "id": 1542203540854,
        "config": {},
        "sockets": [
          {
            "id": 1542203540855,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1542203540856,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 28.782009548611114,
          "y": 41.27400426742532
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
              "x": 38.85577309281671,
              "y": 10.578783614711401
            }
          }
        ],
        "connections": [
          {
            "from": 1542125048417,
            "out": 1542125048419,
            "to": 1542057173569,
            "in": 1542140451388,
            "id": 1542203540850
          },
          {
            "from": 1542140574641,
            "out": 1542140574644,
            "to": 1542125048417,
            "in": 1542125048418,
            "id": 1542203540849
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
          }
        ],
        "position": {
          "x": 8.290666852678582,
          "y": 49.397100084880485
        }
      }
    ],
    "connections": [
      {
        "from": 1542125048424,
        "out": 1542125048426,
        "to": 1542203540854,
        "in": 1542203540855,
        "id": 1542203540857
      },
      {
        "from": 1542125048424,
        "out": 1542125048426,
        "to": 1542140574654,
        "in": 1542140574655,
        "id": 1542203540852
      },
      {
        "from": 1542057173569,
        "out": 1542140451388,
        "to": 1542125048424,
        "in": 1542125048425,
        "id": 1542203540851
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
      }
    ]
  }
