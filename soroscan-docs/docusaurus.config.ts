import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'SoroScan Dev Portal',
  tagline: 'Retro-futuristic terminal-inspired indexing for Soroban',
  favicon: 'img/favicon.ico',

  url: 'https://docs.soroscan.io',
  baseUrl: '/',

  organizationName: 'Harbduls',
  projectName: 'soroscan',

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          path: '../docs',
          routeBasePath: '/', // Serve docs at site root
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Harbduls/soroscan/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: true, // Retro terminal is only dark
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: '◆ SOROSCAN',
      logo: {
        alt: 'SoroScan Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'http://localhost:8000/api/docs/',
          label: 'API Explorer [Live]',
          position: 'right',
        },
        {
          href: 'https://github.com/Harbduls/soroscan',
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
            { label: 'Getting Started', to: '/' },
            { label: 'API Overview', to: '/api-overview' },
            { label: 'SDKs', to: '/sdk-python' },
          ],
        },
        {
          title: 'Community',
          items: [
            { label: 'Stack Overflow', href: 'https://stackoverflow.com/questions/tagged/soroscan' },
            { label: 'Discord', href: 'https://discord.gg/soroscan' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/Harbduls/soroscan' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} SoroScan. EXECUTION_STATUS: SUCCESS [TERMINAL_MODE]`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['python', 'bash', 'json', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
