import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =
  {
    'id': 'f1',
    'connections': [
      {
        'from': '1',
        'out': 'rnc-b',
        'to': '1538033386800',
        'in': 'rnc-a'
      }
    ],
    'children': [
      {
        'id': 'xxxx',
        'type': 'default',
        'position': {
          'x': 497.1171875,
          'y': 53.015625
        },
        'connections': [],
        'children': [
          {
            'position': {
              'x': 227.7421875,
              'y': 278.5859375
            },
            'type': 'random-numbers'
          },
          {
            'type': 'default',
            'position': {
              'x': 498.55078125,
              'y': 282.7890625
            },
            'children': [
              {
                'position': {
                  'x': 206.75,
                  'y': 515.8203125
                },
                'type': 'random-numbers',
                'children': []
              },
              {
                'type': 'default',
                'position': {
                  'x': 480,
                  'y': 515
                },
                'children': [
                  {
                    'position': {
                      'x': 199.53125,
                      'y': 855.79296875
                    },
                    'type': 'random-numbers',
                    'children': []
                  },
                  {
                    'type': 'random-numbers',
                    'position': {
                      'x': 480,
                      'y': 515
                    },
                    'children': []
                  }
                ]
              }
            ]
          }
        ],
        'sockets': []
      },
      {
        'id': 'f2',
        'type': 'default',
        'position': {
          'x': 496.41796875,
          'y': 183.31640625
        },
        'connections': [],
        'children': [
          {
            'id': 'f3',
            'position': {
              'x': 375.49609375,
              'y': 481.4140625
            },
            'type': 'default',
            'connections': [],
            'children': [
              {
                'id': 'qwerty',
                'position': {
                  'x': 0,
                  'y': 0
                },
                'type': 'random-numbers'
              },
              {
                'type': 'random-numbers',
                'position': {
                  'x': 480,
                  'y': 515
                }
              }
            ],
            'sockets': []
          },
          {
            'id': 'zzz',
            'type': 'random-numbers',
            'position': {
              'x': 480,
              'y': 515
            },
            'sockets': [
              {
                'type': 'in',
                'id': 'rnc-a'
              },
              {
                'type': 'out',
                'id': 'rnc-b'
              },
              {
                'type': 'out',
                'id': 'rnc-c'
              }
            ]
          }
        ],
        'sockets': [
          {
            'type': 'in',
            'id': '1538035179596'
          }
        ]
      },
      {
        'type': 'random-numbers',
        'id': '1',
        'position': {
          'x': 237.58984375,
          'y': 328.93359375
        },
        'sockets': [
          {
            'type': 'in',
            'id': 'rnc-a'
          },
          {
            'type': 'out',
            'id': 'rnc-b'
          },
          {
            'type': 'out',
            'id': 'rnc-c'
          }
        ]
      },
      {
        'type': 'random-numbers',
        'state': {},
        'id': '1538033386800',
        'sockets': [
          {
            'type': 'in',
            'id': 'rnc-a'
          },
          {
            'type': 'out',
            'id': 'rnc-b'
          },
          {
            'type': 'out',
            'id': 'rnc-c'
          }
        ],
        'position': {
          'x': 633.3828125,
          'y': 327.8984375
        }
      }
    ]
  };
