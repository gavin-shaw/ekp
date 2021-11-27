export const FarmsListSchema = {
  type: 'Control',
  scope: '#/properties/farms',
  options: {
    columns: {
      audit: {
        name: '',
        width: '50px',
        sortable: false,
        cell: {
          type: 'Control',
          scope: '#/properties/audit',
          label: '',
          options: {
            renderIcon: true,
          },
        },
      },
      name: {
        center: false,
        filter: true,
        cell: {
          type: 'VerticalLayout',
          elements: [
            {
              type: 'Control',
              scope: '#/properties/link',
              label: '',
              options: {
                renderMarkdownLink: true,
              },
            },
            {
              type: 'Control',
              scope: '#/properties/subTitle',
              label: '',
              options: {
                displayOnly: true,
              },
            },
          ],
        },
      },
      age: {
        format: 'duration',
      },
      balance: {
        format: 'currency',
      },
    },
  },
};
