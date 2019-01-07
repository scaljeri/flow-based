export const basic =
  {
    "id": 1546340247802,
    "children": [
      {
        "type": "fractals",
        "title": "Fractals",
        "id": 1546340247803,
        "config": {
          "selected": "mandelbrod"
        },
        "sockets": [
          {
            "id": 1546340247804,
            "type": "in",
            "format": "dimension"
          },
          {
            "id": 1546340247805,
            "type": "out",
            "format": "imageData"
          }
        ],
        "position": {
          "x": 6.938883463541668,
          "y": 17.676657527417746
        }
      },
      {
        "type": "zoomcanvas",
        "title": "Zoomable canavs",
        "id": 1546340247806,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1546340247807,
            "type": "in",
            "format": "imageData"
          },
          {
            "id": 1546340247808,
            "type": "out",
            "format": "dimension"
          }
        ],
        "position": {
          "x": 36.52180989583334,
          "y": 28.741509845463614
        }
      }
    ],
    "connections": [
      {
        "from": 1546340247806,
        "out": 1546340247808,
        "to": 1546340247803,
        "in": 1546340247804,
        "id": 1546374626401
      },
      {
        "from": 1546340247803,
        "out": 1546340247805,
        "to": 1546340247806,
        "in": 1546340247807,
        "id": 1546340574657
      }
    ]
  }
