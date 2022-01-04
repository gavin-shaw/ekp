import list from './realized-pnl-detail-list.element';
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
            '$.nft_pnl_events[?(@.chain.id == "{{ chainId }}" && @.nftCollection.contractAddress == "{{ tokenAddress }}")]',
          scope: {
            chainId: '$.location.pathParams[1]',
            tokenAddress: '$.location.pathParams[2]',
          },
        },
      },
      children: [
        {
          view: 'row',
          containerClassName: 'ml-1',
          columns: [
            {
              className: 'col-auto',
              children: [
                {
                  view: 'image',
                  src: '$[0].nftCollection.logo',
                  size: 36,
                },
              ],
            },
            {
              className: 'col-auto',
              children: [
                {
                  view: 'span',
                  className: 'font-large-1',
                  value: '$[0].nftCollection.name',
                },
              ],
            },
          ],
        },
        {
          view: 'span',
          containerClassName: 'ml-1 mb-2 mt-1',
          className: 'font-small-3',
          value: '$[0].chain.name',
        },
        {
          view: 'row',
          children: [...stats(), {}],
        },
        ...list(),
      ],
    },
  ];
}
