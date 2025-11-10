// @ts-check
// `@type` JSDoc annotations allow editor autocompletion and type checking
// (when paired with `@ts-check`).
// There are various equivalent ways to declare your Docusaurus config.
// See: https://docusaurus.io/docs/api/docusaurus-config

import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Fingerprint Service Integration',
  tagline: 'Complete integration guide for ZKTeco fingerprint reader service',
  favicon: 'img/favicon.ico',

  // Set the production url of your site here
  url: 'https://devkazuto.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/docs-site-fingerprint/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'devkazuto', // Usually your GitHub org/user name.
  projectName: 'docs-site-fingerprint', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },



  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: './sidebars.js',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl: undefined,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
        sitemap: {
          changefreq: 'weekly',
          priority: 0.5,
          ignorePatterns: ['/tags/**'],
          filename: 'sitemap.xml',
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      // Replace with your project's social card
      image: 'img/docusaurus-social-card.jpg',
      docs: {
        sidebar: {
          hideable: true,
          autoCollapseCategories: true,
        },
      },
      navbar: {
        hideOnScroll: true,
        title: 'Fingerprint Service',
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'docs',
            position: 'left',
            label: 'Docs',
          },
          {
            to: '/docs/api-reference/rest-api',
            label: 'API',
            position: 'left',
          },
          {
            to: '/docs/examples/login-system',
            label: 'Examples',
            position: 'left',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'Documentation',
            items: [
              {
                label: 'Getting Started',
                to: '/docs/getting-started/installation',
              },
              {
                label: 'Integration Guides',
                to: '/docs/integration/javascript-vanilla',
              },
              {
                label: 'API Reference',
                to: '/docs/api-reference/rest-api',
              },
            ],
          },
          {
            title: 'Guides',
            items: [
              {
                label: 'Enrollment Flow',
                to: '/docs/guides/enrollment-flow',
              },
              {
                label: 'Verification Flow',
                to: '/docs/guides/verification-flow',
              },
              {
                label: 'Best Practices',
                to: '/docs/guides/best-practices',
              },
            ],
          },
          {
            title: 'Examples',
            items: [
              {
                label: 'Login System',
                to: '/docs/examples/login-system',
              },
              {
                label: 'Attendance System',
                to: '/docs/examples/attendance-system',
              },
              {
                label: 'Access Control',
                to: '/docs/examples/access-control',
              },
            ],
          },
        ],
        copyright: `Copyright © ${new Date().getFullYear()} Fingerprint Service Documentation.`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['php', 'csharp', 'java', 'python', 'bash'],
      },
    }),

  markdown: {
    mermaid: true,
  },

  themes: [
    '@docusaurus/theme-mermaid',
    '@docusaurus/theme-live-codeblock',
  ],
};

export default config;
