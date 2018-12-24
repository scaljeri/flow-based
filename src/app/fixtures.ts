export const basic =
  {
    "id": 1545429029660,
    "children": [
      {
        "type": "custom",
        "title": "Custom code",
        "id": 1545475831110,
        "config": {
          "func": "// const out = new Subject();\n// function(val) {\nout.next(parseInt(val))",
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545475831111,
            "type": "in",
            "format": "string"
          },
          {
            "id": 1545475831112,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 13.679606119791663,
          "y": 47.47554212362911
        }
      },
      {
        "type": "custom",
        "title": "Custom code",
        "id": 1545475359040,
        "config": {
          "func": "// const out = new Subject();\n// function(val) {\nout.next(val + ' yo');",
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545475359041,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1545475359042,
            "type": "out",
            "format": "string"
          }
        ],
        "position": {
          "x": 13.516845703125009,
          "y": 12.428339980059821
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1545475359043,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545475359044,
            "type": "in",
            "format": "string"
          },
          {
            "id": 1545475359045,
            "type": "out",
            "format": "string"
          }
        ],
        "position": {
          "x": 31.225585937500007,
          "y": 11.2354343220339
        }
      },
      {
        "type": "tap",
        "title": "Tap",
        "id": 1545475831114,
        "config": {
          "expanded": false
        },
        "sockets": [
          {
            "id": 1545475831115,
            "type": "in",
            "format": "number"
          },
          {
            "id": 1545475831116,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 31.214599609375,
          "y": 48.40984857926223
        }
      },
      {
        "type": "random-numbers",
        "title": "Random number generator",
        "id": 1545475359038,
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
            "id": 1545475359039,
            "type": "out",
            "format": "number"
          }
        ],
        "position": {
          "x": 3.050740559895827,
          "y": 29.10019940179462
        }
      }
    ],
    "connections": [
      {
        "from": 1545475831110,
        "out": 1545475831112,
        "to": 1545475831114,
        "in": 1545475831115,
        "id": 1545475831117
      },
      {
        "from": 1545475359043,
        "out": 1545475359045,
        "to": 1545475831110,
        "in": 1545475831111,
        "id": 1545475831113
      },
      {
        "from": 1545475359040,
        "out": 1545475359042,
        "to": 1545475359043,
        "in": 1545475359044,
        "id": 1545475359047
      },
      {
        "from": 1545475359038,
        "out": 1545475359039,
        "to": 1545475359040,
        "in": 1545475359041,
        "id": 1545475359046
      }
    ]
  }
