/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: true,
      items: [
        'getting-started/installation',
        'getting-started/authentication',
        'getting-started/quick-start',
      ],
    },
    {
      type: 'category',
      label: 'Integration Guides',
      collapsed: true,
      items: [
        'integration/architectures',
        {
          type: 'category',
          label: 'JavaScript/TypeScript',
          collapsed: true,
          items: [
            'integration/javascript-vanilla',
            'integration/typescript',
            'integration/react',
            'integration/angular',
            'integration/vue',
          ],
        },
        {
          type: 'category',
          label: 'Backend Languages',
          collapsed: true,
          items: [
            'integration/php',
            'integration/laravel',
            'integration/python',
            'integration/dotnet',
            'integration/java',
          ],
        },
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      collapsed: true,
      items: [
        'api-reference/rest-api',
        'api-reference/websocket',
        'api-reference/error-codes',
      ],
    },
    {
      type: 'category',
      label: 'Guides',
      collapsed: true,
      items: [
        'guides/enrollment-flow',
        'guides/verification-flow',
        'guides/identification-flow',
        'guides/best-practices',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      collapsed: true,
      items: [
        'examples/login-system',
        'examples/attendance-system',
        'examples/access-control',
      ],
    },
    {
      type: 'category',
      label: 'Additional Resources',
      collapsed: true,
      items: [
        'guides/web-admin',
        'troubleshooting',
        'deployment',
      ],
    },
  ],
};

export default sidebars;
