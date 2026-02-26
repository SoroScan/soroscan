import { test as base } from '@playwright/test';

/**
 * Custom fixtures for SoroScan E2E tests
 */

type SoroScanFixtures = {
  mockContractId: string;
  mockWebhookUrl: string;
};

export const test = base.extend<SoroScanFixtures>({
  // Mock contract ID fixture
  mockContractId: async ({}, use) => {
    const contractId = 'CCAA1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890';
    await use(contractId);
  },

  // Mock webhook URL fixture
  mockWebhookUrl: async ({}, use) => {
    const webhookUrl = 'https://example.com/webhook';
    await use(webhookUrl);
  },
});

export { expect } from '@playwright/test';

/**
 * Mock data generators
 */

export const mockData = {
  contract: {
    id: 'CCAA1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
    name: 'Test Contract',
    address: 'CCAA1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
    createdAt: '2024-01-01T00:00:00Z',
  },

  event: {
    id: '1',
    contractId: 'CCAA1234567890ABCDEF1234567890ABCDEF1234567890ABCDEF1234567890',
    eventType: 'Transfer',
    timestamp: '2024-01-01T12:00:00Z',
    ledger: 12345,
    eventIndex: 0,
    txHash: 'abc123def456',
    payload: '{"from":"Alice","to":"Bob","amount":100}',
  },

  webhook: {
    id: '1',
    name: 'Test Webhook',
    url: 'https://example.com/webhook',
    eventTypes: ['Transfer', 'Mint'],
    isActive: true,
    createdAt: '2024-01-01T00:00:00Z',
  },

  generateContract: (overrides?: Partial<typeof mockData.contract>) => ({
    ...mockData.contract,
    ...overrides,
  }),

  generateEvent: (overrides?: Partial<typeof mockData.event>) => ({
    ...mockData.event,
    ...overrides,
  }),

  generateWebhook: (overrides?: Partial<typeof mockData.webhook>) => ({
    ...mockData.webhook,
    ...overrides,
  }),

  generateContractId: () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'C';
    for (let i = 0; i < 55; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },
};

/**
 * GraphQL mock responses
 */

export const mockGraphQLResponses = {
  listContracts: {
    data: {
      contracts: [
        mockData.contract,
        mockData.generateContract({ id: 'CBBB', name: 'Another Contract' }),
      ],
    },
  },

  getContract: {
    data: {
      contract: mockData.contract,
    },
  },

  listEvents: {
    data: {
      events: [
        mockData.event,
        mockData.generateEvent({ id: '2', eventType: 'Mint' }),
        mockData.generateEvent({ id: '3', eventType: 'Burn' }),
      ],
    },
  },

  listWebhooks: {
    data: {
      webhooks: [
        mockData.webhook,
        mockData.generateWebhook({ id: '2', name: 'Another Webhook' }),
      ],
    },
  },
};
