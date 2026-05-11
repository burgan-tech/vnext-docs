import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  architectureSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Overview',
      link: { type: 'doc', id: 'overview/index' },
      items: [
        'overview/principles',
      ],
    },
    {
      type: 'category',
      label: 'Domain Model',
      link: { type: 'doc', id: 'domain-model/index' },
      items: [
        'domain-model/topology',
      ],
    },
    {
      type: 'category',
      label: 'Data',
      link: { type: 'doc', id: 'data/index' },
      items: [
        'data/database',
        'data/persistence',
      ],
    },
    {
      type: 'category',
      label: 'Patterns',
      link: { type: 'doc', id: 'patterns/index' },
      items: [
        'patterns/references',
        'patterns/versioning',
      ],
    },
  ],
};

export default sidebars;
