import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'vNext Docs',
  tagline: 'vnext platform için teknik, mimari, business ve ürün dokümantasyonu',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://burgan-tech.github.io',
  baseUrl: '/vnext-docs/',

  organizationName: 'burgan-tech',
  projectName: 'vnext-docs',

  // NOTE: temporarily 'warn' during Phase R refactoring (forward refs to upcoming pages); restore to 'throw' in R9
  onBrokenLinks: 'warn',
  onBrokenAnchors: 'warn',
  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'tr',
    locales: ['tr', 'en'],
    localeConfigs: {
      tr: { label: 'Türkçe', htmlLang: 'tr-TR', path: 'tr' },
      en: { label: 'English', htmlLang: 'en-US', path: 'en' },
    },
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: 'docs',
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
          exclude: ['superpowers/**'],
        },
        blog: {
          showReadingTime: true,
          editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
          blogTitle: 'Release Notes & Updates',
          blogDescription: 'vnext platformu sürüm notları ve duyurular',
          postsPerPage: 10,
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'architecture',
        path: 'architecture',
        routeBasePath: 'architecture',
        sidebarPath: './sidebars-architecture.ts',
        editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'business',
        path: 'business',
        routeBasePath: 'business',
        sidebarPath: './sidebars-business.ts',
        editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
      },
    ],
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'product',
        path: 'product',
        routeBasePath: 'product',
        sidebarPath: './sidebars-product.ts',
        editUrl: 'https://github.com/burgan-tech/vnext-docs/tree/main/',
      },
    ],
  ],

  themes: [
    '@docusaurus/theme-mermaid',
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['tr', 'en'],
        indexDocs: true,
        indexBlog: true,
        indexPages: false,
        docsRouteBasePath: ['docs', 'architecture', 'business', 'product'],
        blogRouteBasePath: ['blog'],
        searchResultLimits: 8,
        highlightSearchTermsOnTargetPage: true,
      },
    ],
  ],

  headTags: [
    {
      tagName: 'meta',
      attributes: { name: 'keywords', content: 'vnext, workflow, platform, bankacılık, dokümantasyon, Burgan Bank' },
    },
    {
      tagName: 'meta',
      attributes: { property: 'og:type', content: 'website' },
    },
    {
      tagName: 'meta',
      attributes: { property: 'og:site_name', content: 'vNext Docs' },
    },
    {
      tagName: 'meta',
      attributes: { name: 'twitter:card', content: 'summary_large_image' },
    },
  ],

  themeConfig: {
    image: 'img/social-card.png',
    metadata: [
      { name: 'description', content: 'vNext Platform — kurumsal iş süreçlerini dijitalleştiren workflow orchestration platformu dokümantasyonu' },
      { property: 'og:title', content: 'vNext Docs' },
      { property: 'og:description', content: 'Teknik, mimari, business ve ürün dokümantasyonu' },
    ],
    navbar: {
      title: 'vNext Docs',
      logo: {
        alt: 'vNext Logo',
        src: 'img/logo.svg',
        srcDark: 'img/logo-dark.svg',
      },
      items: [
        { to: '/docs/intro', label: 'Technical', position: 'left' },
        { to: '/architecture/intro', label: 'Architecture', position: 'left' },
        { to: '/business/intro', label: 'Business', position: 'left' },
        { to: '/product/intro', label: 'Product', position: 'left' },
        { to: '/blog', label: 'Release Notes', position: 'left' },
        { type: 'localeDropdown', position: 'right' },
        {
          href: 'https://github.com/burgan-tech/vnext-docs',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Technical', to: '/docs/intro' },
            { label: 'Architecture', to: '/architecture/intro' },
            { label: 'Business', to: '/business/intro' },
            { label: 'Product', to: '/product/intro' },
          ],
        },
        {
          title: 'vNext Engine',
          items: [
            { label: 'Repository', href: 'https://github.com/burgan-tech/vnext' },
            { label: 'Issues', href: 'https://github.com/burgan-tech/vnext/issues' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'Release Notes', to: '/blog' },
            { label: 'GitHub', href: 'https://github.com/burgan-tech/vnext-docs' },
          ],
        },
      ],
      copyright: `© ${new Date().getFullYear()} Burgan Bank. vNext Platform Documentation.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['csharp', 'bash', 'json', 'yaml'],
    },
    colorMode: {
      defaultMode: 'light',
      respectPrefersColorScheme: true,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
