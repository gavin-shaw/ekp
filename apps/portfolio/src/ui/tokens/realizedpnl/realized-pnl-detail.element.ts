import table from './realized-pnl-detail-table.element';
import stats from './realized-pnl-detail-stats.element';

export default function element() {
  return [
    {
      context: {
        formatter: 'jsonpath',
        array: true,
        value: {
          formatter: 'template',
          value:
            '$.token_pnl_events[?(@.chain.id == "{{ chainId }}" && @.token.address == "{{ tokenAddress }}")]',
          scope: {
            chainId: '$.location.pathParams[1]',
            tokenAddress: '$.location.pathParams[2]',
          },
        },
      },
      children: [
        {
          view: 'tile',
          className: 'mt-3 mb-2 ml-1',
          left: [
            {
              view: 'image',
              src: '$[0].token.logo',
              size: 28,
            },
          ],
          title: '$[0].token.symbol',
          subtitle: '$[0].chain.name',
        },
        {
          view: 'row',
          children: [...stats(), {}],
        },
        ...table(),
      ],
    },
  ];
}
