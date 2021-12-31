export default function homeNftActions() {
  return [
    {
      icon: 'cil-external-link',
      name: 'Token Details',
      rpc: {
        method: 'ek_openLink',
        params: ['$.links.token'],
      },
    },
  ];
}
