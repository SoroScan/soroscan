# Implementation Plan: Contract State Snapshots

## Overview

This implementation plan breaks down the Contract State Snapshots feature into discrete coding tasks. The feature extends SoroScan's monitoring capabilities by capturing contract state at configurable ledger intervals, computing state differences, and exposing historical data through REST and GraphQL APIs.

The implementation follows Django/DRF patterns and integrates with existing SoroScan infrastructure (Celery tasks, SorobanClient, TrackedContract model).

## Tasks

- [x] 1. Create database models and migrations
  - [x] 1.1 Implement ContractSnapshot model
    - Create ContractSnapshot model in appropriate Django app models file
    - Add fields: contract (ForeignKey), ledger_sequence, state_data (JSONField), captured_at, is_truncated, is_compressed
    - Add Meta class with ordering, indexes, and unique constraint
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 11.4_
  
  - [x] 1.2 Implement StateChange model
    - Create StateChange model in appropriate Django app models file
    - Add fields: snapshot (ForeignKey), previous_snapshot (ForeignKey), field_name, old_value (JSONField), new_value (JSONField), created_at
    - Add Meta class with ordering and indexes
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_
  
  - [x] 1.3 Generate and verify database migrations
    - Run makemigrations to generate migration files
    - Review migration for correct field types, indexes, and constraints
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Extend SorobanClient for state retrieval
  - [x] 2.1 Implement get_contract_state method
    - Add get_contract_state method to SorobanClient class
    - Implement RPC call to retrieve contract state
    - Handle response parsing and JSON conversion
    - Implement size checking (1 MB limit)
    - Implement truncation logic with is_truncated flag
    - Implement compression logic with is_compressed flag
    - Return dict with success, state_data, is_truncated, is_compressed, error fields
    - _Requirements: 3.1, 3.2, 3.4, 11.1, 11.3_
  
  - [ ]* 2.2 Write property test for valid contract state retrieval
    - **Property 2: Valid Contract State Retrieval**
    - **Validates: Requirements 3.2**
  
  - [ ]* 2.3 Write property test for invalid contract error handling
    - **Property 3: Invalid Contract Error Handling**
    - **Validates: Requirements 3.3**
  
  - [ ]* 2.4 Write property test for size constraint enforcement
    - **Property 19: Size Constraint Enforcement**
    - **Validates: Requirements 11.1**
  
  - [ ]* 2.5 Write property test for compression round-trip
    - **Property 21: Compression with Metadata**
    - **Validates: Requirements 11.3, 11.4**

- [x] 3. Implement state difference calculation
  - [x] 3.1 Implement compute_state_diff function
    - Create compute_state_diff function that accepts current_state, previous_state, path_prefix
    - Implement recursive traversal for nested objects
    - Detect field additions (old_value=null)
    - Detect field deletions (new_value=null)
    - Detect field modifications (both values present)
    - Build dot-notation paths for nested fields
    - Return list of change dictionaries with field_name, old_value, new_value
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_
  
  - [ ]* 3.2 Write property test for comprehensive change detection
    - **Property 9: Comprehensive Change Detection**
    - **Validates: Requirements 5.3, 5.4, 5.5**
  
  - [ ]* 3.3 Write property test for nested change detection
    - **Property 10: Nested Change Detection**
    - **Validates: Requirements 5.6**
  
  - [ ]* 3.4 Write unit tests for state diff edge cases
    - Test empty state comparison
    - Test single field changes
    - Test array modifications
    - Test deeply nested structures
    - _Requirements: 5.2, 5.6_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement snapshot capture Celery task
  - [x] 5.1 Implement capture_contract_snapshots task
    - Create capture_contract_snapshots Celery task with @shared_task decorator
    - Accept snapshot_interval parameter (default: 1000)
    - Query all active TrackedContracts (is_active=True)
    - For each contract, check if last_indexed_ledger % snapshot_interval == 0
    - Call SorobanClient.get_contract_state for eligible contracts
    - Create ContractSnapshot records with retrieved state data
    - Handle errors gracefully (log and continue processing other contracts)
    - Return summary dict with contracts_processed, snapshots_created, changes_detected, errors
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  
  - [x] 5.2 Implement state change detection in snapshot task
    - After creating ContractSnapshot, query for previous snapshot (same contract, lower ledger_sequence)
    - If previous snapshot exists, call compute_state_diff
    - Create StateChange records for each detected change
    - Link StateChange to both current and previous snapshots
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [x] 5.3 Add truncation warning logging
    - When is_truncated=True, log warning with contract ID and ledger sequence
    - _Requirements: 11.2_
  
  - [ ]* 5.4 Write property test for active contract processing
    - **Property 4: Active Contract Processing**
    - **Validates: Requirements 4.2**
  
  - [ ]* 5.5 Write property test for snapshot interval trigger
    - **Property 5: Snapshot Interval Trigger**
    - **Validates: Requirements 4.3**
  
  - [ ]* 5.6 Write property test for snapshot record completeness
    - **Property 6: Snapshot Record Completeness**
    - **Validates: Requirements 4.5**
  
  - [ ]* 5.7 Write property test for configurable interval respect
    - **Property 7: Configurable Interval Respect**
    - **Validates: Requirements 4.6**
  
  - [ ]* 5.8 Write property test for previous snapshot identification
    - **Property 8: Previous Snapshot Identification**
    - **Validates: Requirements 5.1**
  
  - [ ]* 5.9 Write property test for truncation warning logging
    - **Property 20: Truncation Warning Logging**
    - **Validates: Requirements 11.2**

- [x] 6. Configure Celery Beat schedule
  - [x] 6.1 Add snapshot capture to Celery Beat schedule
    - Add capture-contract-snapshots entry to CELERY_BEAT_SCHEDULE in settings.py
    - Set schedule to 300 seconds (5 minutes)
    - Pass snapshot_interval=1000 as kwarg
    - _Requirements: 4.1, 4.6_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Implement REST API serializers
  - [x] 8.1 Create ContractSnapshotSerializer
    - Create serializer class inheriting from serializers.ModelSerializer
    - Include fields: id, contract, contract_id, ledger_sequence, state_data, captured_at, is_truncated, is_compressed
    - Add contract_id as SerializerMethodField to expose contract.contract_id
    - _Requirements: 6.2_
  
  - [x] 8.2 Create StateChangeSerializer
    - Create serializer class inheriting from serializers.ModelSerializer
    - Include fields: id, snapshot, previous_snapshot, field_name, old_value, new_value, created_at
    - _Requirements: 8.2_

- [x] 9. Implement REST API viewsets
  - [x] 9.1 Create ContractSnapshotViewSet
    - Create viewset inheriting from viewsets.ReadOnlyModelViewSet
    - Set queryset to ContractSnapshot.objects.all().select_related('contract')
    - Set serializer_class to ContractSnapshotSerializer
    - Implement get_queryset to filter by contract_id from URL
    - Add ledger_min and ledger_max query parameter filtering
    - Add ordering by -ledger_sequence
    - Add pagination (page_size=50, max=100)
    - Handle invalid contract_id with 404 response
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_
  
  - [x] 9.2 Create StateChangeViewSet
    - Create viewset inheriting from viewsets.ReadOnlyModelViewSet
    - Set queryset to StateChange.objects.all().select_related('snapshot__contract')
    - Set serializer_class to StateChangeSerializer
    - Implement get_queryset to filter by contract_id from URL
    - Add ledger_min, ledger_max, and field_name query parameter filtering
    - Add ordering by -snapshot__ledger_sequence
    - Add pagination (page_size=50, max=100)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ]* 9.3 Write property test for contract snapshot query correctness
    - **Property 11: Contract Snapshot Query Correctness**
    - **Validates: Requirements 6.2**
  
  - [ ]* 9.4 Write property test for ledger range filtering
    - **Property 12: Ledger Range Filtering**
    - **Validates: Requirements 6.3, 6.4, 8.3, 8.4**
  
  - [ ]* 9.5 Write property test for descending ledger order
    - **Property 13: Descending Ledger Order**
    - **Validates: Requirements 6.5, 8.6**
  
  - [ ]* 9.6 Write property test for invalid contract 404 response
    - **Property 14: Invalid Contract 404 Response**
    - **Validates: Requirements 6.6**
  
  - [ ]* 9.7 Write property test for state change query correctness
    - **Property 17: State Change Query Correctness**
    - **Validates: Requirements 8.2**
  
  - [ ]* 9.8 Write property test for field name filtering
    - **Property 18: Field Name Filtering**
    - **Validates: Requirements 8.5**

- [x] 10. Register REST API URL routes
  - [x] 10.1 Add snapshot and state change endpoints to URL configuration
    - Register ContractSnapshotViewSet at /api/contracts/{id}/snapshots/
    - Register StateChangeViewSet at /api/contracts/{id}/state-changes/
    - _Requirements: 6.1, 8.1_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement GraphQL types and queries
  - [x] 12.1 Create ContractStateType
    - Create Strawberry type class with fields: contract_id, ledger_sequence, state_data, captured_at, is_truncated, is_compressed
    - Use strawberry.scalars.JSON for state_data field
    - _Requirements: 7.5_
  
  - [x] 12.2 Implement contractState query
    - Add contractState field to Query class
    - Accept contract_id (str) and ledger (int) parameters
    - Query ContractSnapshot with contract__contract_id=contract_id and ledger_sequence<=ledger
    - Order by -ledger_sequence and return first result
    - Return None if no snapshot found
    - Handle invalid contract_id with GraphQL error
    - _Requirements: 7.1, 7.2, 7.3, 7.4_
  
  - [x] 12.3 Implement contractSnapshots query
    - Add contractSnapshots field to Query class
    - Accept contract_id (str), ledger_min (Optional[int]), ledger_max (Optional[int]), first (int) parameters
    - Query ContractSnapshot with filters
    - Order by -ledger_sequence
    - Limit results to first parameter value
    - Return list of ContractStateType
    - _Requirements: 7.1_
  
  - [ ]* 12.4 Write property test for point-in-time state query
    - **Property 15: Point-in-Time State Query**
    - **Validates: Requirements 7.2, 7.3**
  
  - [ ]* 12.5 Write property test for GraphQL invalid contract error
    - **Property 16: GraphQL Invalid Contract Error**
    - **Validates: Requirements 7.4**

- [x] 13. Implement Django admin interfaces
  - [x] 13.1 Create ContractSnapshotAdmin
    - Create admin class with list_display: contract, ledger_sequence, captured_at, is_truncated, is_compressed
    - Add list_filter: is_truncated, is_compressed, captured_at
    - Add search_fields: contract__contract_id, contract__name
    - Add readonly_fields: captured_at
    - Override get_queryset to use select_related('contract')
    - Register with @admin.register(ContractSnapshot)
    - _Requirements: 9.1, 9.3, 9.5_
  
  - [x] 13.2 Create StateChangeAdmin
    - Create admin class with list_display: snapshot, field_name, created_at
    - Add list_filter: field_name, created_at
    - Add search_fields: field_name, snapshot__contract__name
    - Add readonly_fields: created_at
    - Register with @admin.register(StateChange)
    - _Requirements: 9.2, 9.4_
  
  - [x] 13.3 Add inline StateChange display to ContractSnapshotAdmin
    - Create StateChangeInline class
    - Add to ContractSnapshotAdmin.inlines
    - _Requirements: 9.4_

- [ ] 14. Write integration tests
  - [ ]* 14.1 Write integration test for snapshot capture flow
    - Create TrackedContract, trigger capture_contract_snapshots task
    - Verify ContractSnapshot created at correct ledger_sequence
    - _Requirements: 12.1, 12.2_
  
  - [ ]* 14.2 Write integration test for state change calculation
    - Create two snapshots with different state data
    - Verify StateChange records created with correct field_name, old_value, new_value
    - _Requirements: 12.3_
  
  - [ ]* 14.3 Write integration test for REST API snapshot retrieval
    - Create snapshots, make GET request to /api/contracts/{id}/snapshots/
    - Verify response contains correct snapshots with proper ordering
    - _Requirements: 12.4_
  
  - [ ]* 14.4 Write integration test for GraphQL contractState query
    - Create snapshots, execute contractState query
    - Verify correct snapshot returned for point-in-time query
    - _Requirements: 12.5_
  
  - [ ]* 14.5 Write integration test for snapshot size constraint
    - Create large state data exceeding 1 MB
    - Verify truncation occurs and is_truncated flag is set
    - _Requirements: 12.6_

- [ ] 15. Write property test for snapshot uniqueness constraint
  - [ ]* 15.1 Write property test for snapshot uniqueness
    - **Property 1: Snapshot Uniqueness Constraint**
    - **Validates: Requirements 1.5**

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Add configuration and documentation
  - [x] 17.1 Add environment variable configuration
    - Document SNAPSHOT_INTERVAL, SNAPSHOT_MAX_SIZE_BYTES, SNAPSHOT_COMPRESSION_ENABLED in settings
    - Add default values to settings.py
    - _Requirements: 4.6, 11.1, 11.3_
  
  - [x] 17.2 Add Prometheus metrics (optional)
    - Add counters and histograms for snapshot capture monitoring
    - _Requirements: 4.1_

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties using Hypothesis
- Integration tests validate end-to-end flows
- The implementation follows existing SoroScan patterns for Django models, DRF viewsets, and Celery tasks
- All database queries should use select_related/prefetch_related to avoid N+1 queries
- Error handling should be graceful with appropriate logging
- API responses should follow existing SoroScan pagination and serialization patterns
