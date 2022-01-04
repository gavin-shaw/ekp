import realizedPnlList from './realized-pnl-list.element';
import realizedPnlStats from './realized-pnl-stats.element';

export default function element() {
  return [
    {
      view: 'progressCard',
      description: 'We are fetching your transaction data, hang tight!',
      when: { not: '$.token_pnl_summaries' },
      milestones: '$.token_pnl_milestones',
    },
    {
      when: '$.token_pnl_summaries',
      children: [
        {
          view: 'row',
          children: [...realizedPnlStats(), {}],
        },
        ...realizedPnlList(),
      ],
    },
  ];
}
