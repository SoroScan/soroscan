import { Page } from '@playwright/test';

export async function setupMocks(page: Page) {
    await page.route('**/api/graphql', async (route) => {
        const request = route.request();
        const postData = request.postDataJSON();
        const query = postData?.query || '';
        const operationName = postData?.operationName;

        // Handle different GraphQL queries based on content or operationName
        if (query.includes('AllContracts')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        contracts: [
                            { contractId: 'CABC1234567890', name: 'Test Token' },
                            { contractId: 'CDEF0987654321', name: 'Liquidity Pool' }
                        ]
                    }
                }),
            });
        }

        if (query.includes('EventTypes')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        eventTypes: ['SWAP', 'MINT', 'BURN', 'TRANSFER']
                    }
                }),
            });
        }

        if (query.includes('ExplorerEvents') || query.includes('AllEvents')) {
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    data: {
                        events: [
                            {
                                id: 'ev_1',
                                eventType: 'SWAP',
                                ledger: 1001,
                                eventIndex: 0,
                                timestamp: new Date().toISOString(),
                                txHash: '0x123...abc',
                                payload: { amount: '100', token: 'XLM' },
                                contractId: 'CABC1234567890',
                                contractName: 'Test Token'
                            },
                            {
                                id: 'ev_2',
                                eventType: 'TRANSFER',
                                ledger: 1002,
                                eventIndex: 1,
                                timestamp: new Date().toISOString(),
                                txHash: '0x456...def',
                                payload: { from: 'addr1', to: 'addr2', amount: '50' },
                                contractId: 'CABC1234567890',
                                contractName: 'Test Token'
                            }
                        ],
                        allEvents: [
                            {
                                id: 'ev_1',
                                eventType: 'SWAP',
                                ledger: 1001,
                                eventIndex: 0,
                                timestamp: new Date().toISOString(),
                                txHash: '0x123...abc',
                                payload: { amount: '100', token: 'XLM' },
                                contractId: 'CABC1234567890',
                                contractName: 'Test Token'
                            }
                        ]
                    }
                }),
            });
        }

        // Default response for other queries
        return route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ data: {} }),
        });
    });
}
