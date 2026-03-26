# Requirements Document

## Introduction

SoroScan's public contract registry enables developers to discover, explore, and evaluate Soroban smart contracts indexed on the platform. Similar to Etherscan's verified contracts directory, the registry provides a searchable, filterable catalog of contracts with metadata, analytics, and community-driven validation. This feature includes a public registry page, individual contract profile pages, a submission flow for community review, and a queryable REST API.

## Glossary

- **Registry**: The public directory of indexed Soroban smart contracts available for discovery.
- **Contract**: A Soroban smart contract that has been indexed by SoroScan and submitted to the registry.
- **Contract_Card**: A summary UI component displaying a contract's name, description, event volume, and tags.
- **Contract_Profile**: A detailed page for a single contract showing full metadata and analytics.
- **Tag**: A user-defined or system-defined label attached to a contract for categorization (e.g., "token", "defi", "nft").
- **Event_Volume**: The total number of events emitted by a contract, used as an activity metric.
- **Registry_API**: The REST API endpoint that exposes registry data for programmatic access.
- **Submission**: The act of a user proposing a contract for inclusion in the public registry.
- **Review**: A community-submitted rating and comment attached to a contract in the registry.
- **Reviewer**: An authenticated user who submits a review for a contract.
- **Search_Query**: A text string or tag used to filter contracts in the registry.

---

## Requirements

### Requirement 1: Display Public Contract Registry

**User Story:** As a developer, I want to browse a public directory of indexed contracts, so that I can discover contracts deployed on the Stellar network.

#### Acceptance Criteria

1. THE Registry SHALL display all contracts that have been approved for public listing.
2. WHEN the registry page loads, THE Registry SHALL render each contract as a Contract_Card showing the contract name, description, event volume, and tags.
3. WHEN no contracts are available, THE Registry SHALL display a message indicating the registry is empty.
4. THE Registry SHALL paginate results, displaying no more than 50 contracts per page.

---

### Requirement 2: Search and Filter Contracts

**User Story:** As a developer, I want to search and filter contracts by name or tag, so that I can quickly find contracts relevant to my use case.

#### Acceptance Criteria

1. WHEN a Search_Query is entered in the search field, THE Registry SHALL filter the displayed contracts to those whose name or tags contain the Search_Query string (case-insensitive).
2. WHEN a tag is selected as a filter, THE Registry SHALL display only contracts that include that Tag.
3. WHEN a Search_Query returns no matches, THE Registry SHALL display a message indicating no contracts were found for the given query.
4. WHEN the search field is cleared, THE Registry SHALL restore the full unfiltered contract list.
5. THE Registry SHALL return filtered results within 500ms of the Search_Query being submitted.

---

### Requirement 3: Contract Profile Page

**User Story:** As a developer, I want to view a detailed profile for a specific contract, so that I can evaluate its activity and metadata before integrating it.

#### Acceptance Criteria

1. WHEN a contract is selected from the registry, THE Contract_Profile SHALL display the contract's name, description, contract ID, tags, and Event_Volume.
2. THE Contract_Profile SHALL display an analytics section showing event volume over time as a time-series chart.
3. WHEN a contract ID in the URL does not correspond to a known registry entry, THE Contract_Profile SHALL return a 404 response and display a not-found message.
4. THE Contract_Profile SHALL be accessible at the path `/registry/:contractId`.

---

### Requirement 4: Submit Contract for Community Review

**User Story:** As a developer, I want to submit a contract for inclusion in the public registry, so that others can discover and use contracts I have deployed.

#### Acceptance Criteria

1. WHEN a user submits a contract via the submission form, THE Registry SHALL record the submission with the contract ID, name, description, and tags provided by the submitter.
2. IF a submitted contract ID is already present in the registry, THEN THE Registry SHALL reject the submission and return a descriptive error message.
3. IF a submitted contract ID does not correspond to a contract indexed by SoroScan, THEN THE Registry SHALL reject the submission and return a descriptive error message.
4. WHEN a submission is accepted, THE Registry SHALL place the contract in a pending state awaiting community review before public listing.
5. THE Registry SHALL confirm a successful submission to the user with a confirmation message including the submitted contract ID.

---

### Requirement 5: Community Reviews and Ratings

**User Story:** As a developer, I want to read and submit community reviews for contracts, so that I can make informed decisions based on peer feedback.

#### Acceptance Criteria

1. WHERE community reviews are enabled, THE Contract_Profile SHALL display all approved reviews for the contract, including the rating (1–5) and comment text.
2. WHERE community reviews are enabled, WHEN an authenticated Reviewer submits a review, THE Registry SHALL record the rating and comment and associate it with the contract.
3. WHERE community reviews are enabled, IF a Reviewer submits more than one review for the same contract, THEN THE Registry SHALL reject the duplicate and return a descriptive error message.
4. WHERE community reviews are enabled, THE Contract_Profile SHALL display the aggregate average rating for the contract, calculated from all approved reviews.
5. WHERE community reviews are enabled, IF a submitted review contains a rating outside the range of 1 to 5, THEN THE Registry SHALL reject the review and return a descriptive error message.

---

### Requirement 6: Registry REST API

**User Story:** As a developer, I want to query the contract registry via a REST API, so that I can integrate registry data into my own tools and workflows.

#### Acceptance Criteria

1. THE Registry_API SHALL expose a `GET /api/registry/contracts/` endpoint that returns a JSON array of public contracts.
2. WHEN the `q` query parameter is provided, THE Registry_API SHALL return only contracts whose name or tags match the value of `q` (case-insensitive).
3. WHEN the `sort` query parameter is set to `volume`, THE Registry_API SHALL return contracts ordered by Event_Volume in descending order.
4. WHEN the `sort` query parameter is set to `name`, THE Registry_API SHALL return contracts ordered alphabetically by name in ascending order.
5. IF an unsupported value is provided for the `sort` parameter, THEN THE Registry_API SHALL return a 400 response with a descriptive error message.
6. THE Registry_API SHALL support pagination via `page` and `limit` query parameters, with a maximum `limit` of 100.
7. IF the `limit` parameter exceeds 100, THEN THE Registry_API SHALL return a 400 response with a descriptive error message.
8. THE Registry_API SHALL return responses in under 300ms for queries against up to 10,000 indexed contracts.
9. THE Registry_API SHALL return a `GET /api/registry/contracts/:contractId` endpoint that returns the full metadata and analytics for a single contract.
10. IF a requested contract ID does not exist in the registry, THEN THE Registry_API SHALL return a 404 response with a descriptive error message.
