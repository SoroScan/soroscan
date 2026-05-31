import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
import apiSidebar from '../docs/api-reference/sidebar';

const sidebars: SidebarsConfig = {
  apiSidebar: [
    {
      type: 'category',
      label: 'API Reference',
      link: {
        type: 'generated-index',
        title: 'API Reference',
        description: 'SoroScan API endpoints',
        slug: '/category/api'
      },
      items: apiSidebar,
    }
  ],
  tutorialSidebar: [
    'getting-started',
    'api-overview',
    {
      type: 'category',
      label: 'SDKs',
      items: ['sdk-python', 'sdk-typescript'],
    },
    {
      type: 'category',
      label: 'Cookbook',
      items: [
        'cookbook/track-contract-events',
        'cookbook/setup-webhook',
        'cookbook/paginate-events',
        'cookbook/filter-by-event-type',
        'cookbook/monitor-contract-activity',
        'cookbook/query-transaction-events',
        'cookbook/manage-api-keys',
        'cookbook/check-rate-limits',
        'cookbook/graphql-advanced-queries',
        'cookbook/deploy-self-hosted',
        'cookbook/migrate-from-rest-to-graphql',
      ],
    },
    {
      type: 'category',
      label: 'Deployment',
      items: [
        'deployment/docker-compose',
        'deployment/kubernetes',
        'deployment/cloud-platforms',
      ],
    },
    {
      type: 'category',
      label: 'Examples',
      items: ['examples/query-events', 'examples/webhook-setup'],
    },
    'rate-limits',
    'changelog',
    'faq',
  ],
};

export default sidebars;
export default sidebars;
