export const basic =
  {
    'id': 1539945982937,
    'children': [
      {
        'type': 'random-numbers',
        'title': 'Random number generator',
        'id': 1539945982938,
        'config': {
          'min': 0,
          'max': 100,
          'start': 0,
          'end': 1,
          'intervalMax': 10000,
          'intervalMin': 100,
          'interval': 1000,
          'integer': true
        },
        'sockets': [
          {
            'type': 'out',
            'id': 1539945982939
          }
        ],
        'position': {
          'x': 30.77880859375,
          'y': 32.57301298008535
        }
      },
      {
        'type': 'console',
        'title': 'Log',
        'id': 1539945982940,
        'config': {},
        'sockets': [
          {
            'type': 'in',
            'id': 1539945982941
          },
          {
            'type': 'out',
            'id': 1539945982942
          }
        ],
        'position': {
          'x': 63.75461154513889,
          'y': 37.357196834992884
        }
      }
    ],
    'connections': []
  };

