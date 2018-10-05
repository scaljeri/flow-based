import { XxlFlow } from 'flow-based';

// export const nested = { children: [] };

export const nested =
  {
    'children': [
      {
        'type': 'random-numbers',
        'title': 'Random number generator',
        'id': '1538725296022',
        'config': {
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
        'position': {
          'x': 160.62109375,
          'y': 179.76953125
        }
      },
      {
        'type': 'console',
        'title': 'Console.log',
        'id': '1538725770955',
        'config': {
          'sockets': [
            {
              'type': 'in',
              'id': 'csl-a'
            },
            {
              'type': 'out',
              'id': 'csl-b'
            }
          ]
        },
        'position': {
          'x': 478.4296875,
          'y': 141.36328125
        }
      },
      {
        'type': 'random-numbers',
        'title': 'Random number generator',
        'id': '1538726839589',
        'config': {
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
        'position': {
          'x': 123.28515625,
          'y': 463.078125
        }
      },
      {
        'type': 'console',
        'title': 'Console.log',
        'id': '1538726850151',
        'config': {
          'sockets': [
            {
              'type': 'in',
              'id': 'csl-a'
            },
            {
              'type': 'out',
              'id': 'csl-b'
            }
          ]
        },
        'position': {
          'x': 823.9140625,
          'y': 404.9765625
        }
      }
    ],
    'connections': [
      {
        'from': '1538725296022',
        'out': 'rnc-b',
        'to': '1538725770955',
        'in': 'csl-a',
        'id': '1538726587436'
      },
      {
        'from': '1538726839589',
        'out': 'rnc-b',
        'to': '1538725770955',
        'in': 'csl-a',
        'id': '1538726843085'
      },
      {
        'from': '1538725770955',
        'out': 'csl-b',
        'to': '1538726850151',
        'in': 'csl-a',
        'id': '1538726854141'
      }
    ]
  };
