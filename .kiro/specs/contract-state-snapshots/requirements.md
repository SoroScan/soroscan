# Requirements Document

## Introduction

This feature adds contract state snapshot capture and state change tracking to SoroScan. The system will periodically capture contract state at configurable ledger intervals, store state snapshots, compute state differences between snapshots, and expose this data through REST and GraphQL APIs. This enables operators to query historical contract state and analyze state evolution over time.

## Glossary

- **Contract**: A Soroban smart contract deployed on the Stellar network
- **TrackedContract**: A Contract registered in SoroScan for monitoring
- **Ledger**: A sequential block in the Stellar blockchain identified by ledger_sequence
- **ContractSnapshot**: A captured state of a Contract at a specific Ledger
- **StateChange**: A recorded difference in a specific field between two ContractSnapshots
- **Snapshot_Interval**: The number of Ledgers between consecutive ContractSnapshots (configurable, default: 1000)
- **State_Data**: The complete state of a Contract represented as JSON
- **Snapshot_Task**: A background Celery task that captures ContractSnapshots
- **API**: The REST API endpoint layer using Django REST Framework
- **GraphQL_API**: The GraphQL query interface using Strawberry
- **Admin_View**: The Django admin interface for viewing state timelines

## Requirements

### Requirement 1: Contract Snapshot Data Model

**User Story:** As a developer, I want to store contract state snapshots in the database, so that I can query historical contract state.

#### Acceptance Criteria

1. THE ContractSnapshot model SHALL store a reference to a TrackedContract
2. THE ContractSnapshot model SHALL store the ledger_sequence at which the snapshot was captured
3. THE ContractSnapshot model SHALL store State_Data as JSON
4. THE ContractSnapshot model SHALL store a captured_at timestamp
5. THE ContractSnapshot model SHALL enforce uniqueness on the combination of contract and ledger_sequence
6. THE ContractSnapshot model SHALL maintain an index on contract and ledger_sequence in descending order

### Requirement 2: State Change Data Model

**User Story:** As an analyst, I want to track state changes between snapshots, so that I can identify when specific fields changed.

#### Acceptance Criteria

1. THE StateChange model SHALL store a reference to a ContractSnapshot
2. THE StateChange model SHALL store a reference to the previous ContractSnapshot
3. THE StateChange model SHALL store the field_name that changed
4. THE StateChange model SHALL store the old_value as JSON
5. THE StateChange model SHALL store the new_value as JSON
6. THE StateChange model SHALL store a created_at timestamp

### Requirement 3: Contract State Retrieval

**User Story:** As a system component, I want to retrieve contract state from the Stellar network, so that I can capture snapshots.

#### Acceptance Criteria

1. THE Stellar_Client SHALL provide a get_contract_state method that accepts a contract_id
2. WHEN get_contract_state is called with a valid contract_id, THE Stellar_Client SHALL return the current State_Data
3. WHEN get_contract_state is called with an invalid contract_id, THE Stellar_Client SHALL return an error
4. IF the returned State_Data exceeds 1 MB, THEN THE Stellar_Client SHALL truncate or compress the data

### Requirement 4: Periodic Snapshot Capture

**User Story:** As an operator, I want snapshots captured automatically at regular intervals, so that I don't need to manually trigger captures.

#### Acceptance Criteria

1. THE Snapshot_Task SHALL execute periodically as a Celery background task
2. WHEN the Snapshot_Task executes, THE Snapshot_Task SHALL iterate through all active TrackedContracts
3. WHEN a TrackedContract has a last_indexed_ledger that is a multiple of Snapshot_Interval, THE Snapshot_Task SHALL capture a ContractSnapshot
4. WHEN capturing a ContractSnapshot, THE Snapshot_Task SHALL retrieve State_Data using Stellar_Client.get_contract_state
5. WHEN capturing a ContractSnapshot, THE Snapshot_Task SHALL create a ContractSnapshot record with the contract, ledger_sequence, and State_Data
6. THE Snapshot_Interval SHALL be configurable with a default value of 1000 Ledgers

### Requirement 5: State Difference Calculation

**User Story:** As an analyst, I want state differences computed automatically, so that I can see what changed between snapshots.

#### Acceptance Criteria

1. WHEN a new ContractSnapshot is created, THE System SHALL retrieve the previous ContractSnapshot for the same Contract
2. WHEN a previous ContractSnapshot exists, THE System SHALL compare State_Data between the two snapshots
3. WHEN a field value differs between snapshots, THE System SHALL create a StateChange record
4. THE System SHALL correctly identify field additions as changes with old_value set to null
5. THE System SHALL correctly identify field deletions as changes with new_value set to null
6. THE System SHALL correctly identify changes within nested objects and arrays

### Requirement 6: REST API Snapshot Retrieval

**User Story:** As a client application, I want to retrieve snapshots via REST API, so that I can display historical state.

#### Acceptance Criteria

1. THE API SHALL provide a GET endpoint at /api/contracts/{id}/snapshots/
2. WHEN the endpoint receives a request with a valid contract id, THE API SHALL return all ContractSnapshots for that Contract
3. WHERE a ledger_min query parameter is provided, THE API SHALL filter snapshots to ledger_sequence greater than or equal to ledger_min
4. WHERE a ledger_max query parameter is provided, THE API SHALL filter snapshots to ledger_sequence less than or equal to ledger_max
5. THE API SHALL return snapshots ordered by ledger_sequence in descending order
6. WHEN the endpoint receives a request with an invalid contract id, THE API SHALL return a 404 error

### Requirement 7: GraphQL State Query

**User Story:** As a client application, I want to query contract state at a specific ledger via GraphQL, so that I can retrieve point-in-time state efficiently.

#### Acceptance Criteria

1. THE GraphQL_API SHALL provide a contractState query that accepts contractId and ledger parameters
2. WHEN contractState is called with valid parameters, THE GraphQL_API SHALL return the State_Data from the ContractSnapshot at or before the specified ledger
3. WHEN contractState is called and no snapshot exists at or before the specified ledger, THE GraphQL_API SHALL return null
4. WHEN contractState is called with an invalid contractId, THE GraphQL_API SHALL return an error
5. THE GraphQL_API SHALL define a ContractState type that includes contractId, ledgerSequence, stateData, and capturedAt fields

### Requirement 8: State Change Retrieval

**User Story:** As an analyst, I want to retrieve state changes for a contract, so that I can analyze state evolution.

#### Acceptance Criteria

1. THE API SHALL provide a GET endpoint at /api/contracts/{id}/state-changes/
2. WHEN the endpoint receives a request with a valid contract id, THE API SHALL return all StateChanges for ContractSnapshots of that Contract
3. WHERE a ledger_min query parameter is provided, THE API SHALL filter changes to snapshots with ledger_sequence greater than or equal to ledger_min
4. WHERE a ledger_max query parameter is provided, THE API SHALL filter changes to snapshots with ledger_sequence less than or equal to ledger_max
5. WHERE a field_name query parameter is provided, THE API SHALL filter changes to the specified field_name
6. THE API SHALL return changes ordered by snapshot ledger_sequence in descending order

### Requirement 9: Admin State Timeline View

**User Story:** As an administrator, I want to view state timelines in the admin interface, so that I can monitor contract state evolution.

#### Acceptance Criteria

1. THE Admin_View SHALL display ContractSnapshot records in the Django admin interface
2. THE Admin_View SHALL display StateChange records in the Django admin interface
3. WHEN viewing a TrackedContract in the admin, THE Admin_View SHALL display a list of associated ContractSnapshots
4. WHEN viewing a ContractSnapshot in the admin, THE Admin_View SHALL display associated StateChanges
5. THE Admin_View SHALL display snapshots ordered by ledger_sequence in descending order

### Requirement 10: Database Migration

**User Story:** As a developer, I want database migrations generated automatically, so that I can apply schema changes safely.

#### Acceptance Criteria

1. THE System SHALL generate a Django migration file for the ContractSnapshot model
2. THE System SHALL generate a Django migration file for the StateChange model
3. WHEN the migration is applied, THE System SHALL create the ContractSnapshot table with all specified fields and constraints
4. WHEN the migration is applied, THE System SHALL create the StateChange table with all specified fields and constraints
5. WHEN the migration is applied, THE System SHALL create the specified indexes

### Requirement 11: Snapshot Size Constraint

**User Story:** As an operator, I want snapshot sizes limited, so that database storage remains manageable.

#### Acceptance Criteria

1. WHEN State_Data exceeds 1 MB, THE System SHALL truncate the data
2. WHEN State_Data exceeds 1 MB, THE System SHALL log a warning indicating truncation occurred
3. WHERE compression is available, THE System SHALL compress State_Data before storing
4. THE System SHALL store an indicator when State_Data has been truncated or compressed

### Requirement 12: Integration Testing

**User Story:** As a developer, I want integration tests for snapshot capture, so that I can verify the feature works end-to-end.

#### Acceptance Criteria

1. THE Test_Suite SHALL include a test that creates a TrackedContract and triggers snapshot capture
2. THE Test_Suite SHALL include a test that verifies ContractSnapshot creation at the correct ledger_sequence
3. THE Test_Suite SHALL include a test that verifies StateChange calculation between two snapshots
4. THE Test_Suite SHALL include a test that verifies the REST API snapshot retrieval endpoint
5. THE Test_Suite SHALL include a test that verifies the GraphQL contractState query
6. THE Test_Suite SHALL include a test that verifies snapshot size constraint enforcement
