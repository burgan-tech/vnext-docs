import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  technicalSidebar: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      link: { type: 'doc', id: 'getting-started/index' },
      items: [
        'getting-started/local-dev',
        'getting-started/multi-domain',
        'getting-started/tutorial',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      link: { type: 'doc', id: 'deployment/index' },
      items: [
        'deployment/helm-chart',
        'deployment/release-viewer',
      ],
    },
    {
      type: 'category',
      label: 'Developer Tools',
      link: { type: 'doc', id: 'tools/index' },
      items: [
        'tools/forge-studio',
        'tools/workflow-cli',
        'tools/template-cli',
        'tools/ai-assisted-development',
        'tools/mcp-runtime',
      ],
    },
    {
      type: 'category',
      label: 'Workflow',
      collapsible: true,
      collapsed: true,
      items: [
        'components/workflow',
        {
          type: 'category',
          label: 'Tasks',
          link: { type: 'doc', id: 'components/tasks/index' },
          items: [
            'components/tasks/http',
            'components/tasks/soap',
            'components/tasks/script',
            'components/tasks/trigger',
            'components/tasks/get-instances',
            'components/tasks/state-store',
            'components/tasks/cache-aside',
            'components/tasks/notification',
            'components/tasks/dapr-service',
            'components/tasks/dapr-pubsub',
            'components/tasks/dapr-binding',
            'components/tasks/dapr-http-endpoint',
          ],
        },
        {
          type: 'category',
          label: 'Functions',
          link: { type: 'doc', id: 'components/functions/index' },
          items: [
            'components/functions/built-in',
            'components/functions/custom',
          ],
        },
        'components/mappings',
        'components/mapping-component',
        'components/interfaces',
        'components/extension',
        'components/schema',
        'components/view',
        'components/urn-catalog',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/user-integration',
        'concepts/instance-data',
        'concepts/authorization',
      ],
    },
    {
      type: 'category',
      label: 'Practical Guides',
      items: [
        'how-to/error-handling',
        'how-to/instance-filtering',
        'how-to/view-selection',
        'how-to/async-sync',
        {
          type: 'category',
          label: 'Pseudo UI (View Concept)',
          link: { type: 'doc', id: 'how-to/view-consept/giris' },
          items: [
            'how-to/view-consept/tasarimci-rehberi',
            'how-to/view-consept/view-yapisi',
            'how-to/view-consept/schema-tanimi',
            'how-to/view-consept/data-akisi',
            'how-to/view-consept/aksiyonlar',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'Yapılandırma',
      items: [
        'configuration/url-templates',
        'configuration/service-discovery',
        'configuration/server-timeout',
        'configuration/header-limits',
        'configuration/scripting',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      link: { type: 'doc', id: 'api-reference/index' },
      items: [
        'api-reference/rest-api',
        'api-reference/init-service',
      ],
    },
  ],
};

export default sidebars;
