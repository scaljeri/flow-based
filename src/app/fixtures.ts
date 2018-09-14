import { XxlFlow, XxlFlowUnit, XxlFlowUnitState } from 'flow-based';

// export const nested = { children: [] };

export const nested = {
  'children': [
    {
      'type': 'default',
      'position': {
        'x': 497.1171875,
        'y': 53.015625
      },
      'children': [
        {
          'position': {
            'x': 227.7421875,
            'y': 278.5859375
          },
          'type': 'random-numbers',
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
      ]
    },
    {
      'type': 'default',
      'position': {
        'x': 496.41796875,
        'y': 183.31640625
      },
      'children': [
        {
          'position': {
            'x': 375.49609375,
            'y': 481.4140625
          },
          'type': 'default',
          'children': [
            {
              'position': {
                'x': 0,
                'y': 0
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
    },
    {
      'type': 'random-numbers',
      'position': {
        'x': 480,
        'y': 493
      },
      'children': []
    }
  ]
} as XxlFlow;
