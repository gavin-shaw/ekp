export const portfolioStats = {
  view: 'stats',
  title: 'Summary',
  subtitle: {
    view: 'spinner',
    before: '$.lastTimestamp.formattedRelative',
  },
  items: '$.portfolioStats',
  columns: {
    title: '$.value',
    subtitle: '$.name',
    icon: 'cil-calculator',
  },
};
