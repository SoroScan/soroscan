"""Tests for the GraphQL contract search and dependency queries."""

import pytest
from django.utils import timezone
from soroscan.ingest.models import ContractDependency, CallGraph, ContractMetadata
from soroscan.ingest.schema import schema as soroscan_schema

from .factories import (
    TrackedContractFactory,
    ContractMetadataFactory,
)


@pytest.mark.django_db
class TestSearchContractsQuery:
    """Tests for the searchContracts GraphQL query."""

    def test_search_contracts_by_name(self):
        """Search contracts by name substring."""
        # Create contracts with metadata
        contract1 = TrackedContractFactory(name="TokenContract")
        contract2 = TrackedContractFactory(name="SwapContract")
        
        metadata1 = ContractMetadataFactory(
            contract=contract1,
            name="Token Exchange",
            description="A token exchange contract",
            tags=["exchange", "token"]
        )
        metadata2 = ContractMetadataFactory(
            contract=contract2,
            name="Liquidity Pool",
            description="A liquidity pool contract",
            tags=["pool", "liquidity"]
        )
        
        # Search for "token" - should match contract1
        query = """
            query {
                searchContracts(query: "token") {
                    contractId
                    name
                    metadata {
                        name
                        description
                    }
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 1
        assert result.data["searchContracts"][0]["contractId"] == contract1.contract_id
        assert result.data["searchContracts"][0]["metadata"]["name"] == "Token Exchange"
    
    def test_search_contracts_by_description(self):
        """Search contracts by description substring."""
        contract1 = TrackedContractFactory()
        contract2 = TrackedContractFactory()
        
        metadata1 = ContractMetadataFactory(
            contract=contract1,
            name="Contract A",
            description="This contract handles token swaps",
            tags=[]
        )
        metadata2 = ContractMetadataFactory(
            contract=contract2,
            name="Contract B",
            description="This contract handles liquidity",
            tags=[]
        )
        
        # Search for "swaps" in description - should match contract1
        query = """
            query {
                searchContracts(query: "swaps") {
                    contractId
                    metadata {
                        name
                    }
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 1
        assert result.data["searchContracts"][0]["metadata"]["name"] == "Contract A"
    
    def test_search_contracts_by_tags(self):
        """Search contracts by tags."""
        contract1 = TrackedContractFactory()
        contract2 = TrackedContractFactory()
        contract3 = TrackedContractFactory()
        
        metadata1 = ContractMetadataFactory(
            contract=contract1,
            name="Contract A",
            description="Test",
            tags=["defi", "lending"]
        )
        metadata2 = ContractMetadataFactory(
            contract=contract2,
            name="Contract B",
            description="Test",
            tags=["defi", "dex"]
        )
        metadata3 = ContractMetadataFactory(
            contract=contract3,
            name="Contract C",
            description="Test",
            tags=["nft", "marketplace"]
        )
        
        # Search for contracts with "defi" tag
        query = """
            query {
                searchContracts(tags: ["defi"]) {
                    contractId
                    metadata {
                        name
                        tags
                    }
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 2
        contract_names = {c["metadata"]["name"] for c in result.data["searchContracts"]}
        assert contract_names == {"Contract A", "Contract B"}
    
    def test_search_contracts_by_name_and_tags(self):
        """Search contracts by both name query and tags."""
        contract1 = TrackedContractFactory()
        contract2 = TrackedContractFactory()
        
        metadata1 = ContractMetadataFactory(
            contract=contract1,
            name="Lending Protocol",
            description="A lending protocol",
            tags=["defi", "lending"]
        )
        metadata2 = ContractMetadataFactory(
            contract=contract2,
            name="DEX Protocol",
            description="A decentralized exchange",
            tags=["defi", "dex"]
        )
        
        # Search for "lending" in name/description AND "defi" tag
        query = """
            query {
                searchContracts(query: "lending", tags: ["defi"]) {
                    contractId
                    metadata {
                        name
                        tags
                    }
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 1
        assert result.data["searchContracts"][0]["metadata"]["name"] == "Lending Protocol"
    
    def test_search_contracts_empty_result(self):
        """Search returns empty list when no matches."""
        contract = TrackedContractFactory()
        metadata = ContractMetadataFactory(
            contract=contract,
            name="Test Contract",
            description="Test",
            tags=["test"]
        )
        
        # Search for non-existent term
        query = """
            query {
                searchContracts(query: "nonexistent") {
                    contractId
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert result.data["searchContracts"] == []
    
    def test_search_contracts_case_insensitive(self):
        """Search is case-insensitive."""
        contract = TrackedContractFactory()
        metadata = ContractMetadataFactory(
            contract=contract,
            name="Token Contract",
            description="This is a TOKEN contract",
            tags=["TOKEN"]
        )
        
        # Search with different case
        query = """
            query {
                searchContracts(query: "token") {
                    contractId
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 1
    
    def test_search_contracts_limit(self):
        """Search respects the limit parameter."""
        # Create more contracts than the default limit
        contracts = []
        for i in range(30):
            contract = TrackedContractFactory()
            metadata = ContractMetadataFactory(
                contract=contract,
                name=f"Contract {i}",
                description=f"Description {i}",
                tags=[]
            )
            contracts.append(contract)
        
        # Default limit is 20
        query = """
            query {
                searchContracts(query: "Contract") {
                    contractId
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 20
        
        # Test with custom limit
        query = """
            query($limit: Int!) {
                searchContracts(query: "Contract", limit: $limit) {
                    contractId
                }
            }
        """
        
        result = soroscan_schema.execute_sync(
            query,
            variable_values={"limit": 10}
        )
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 10
    
    def test_search_contracts_limit_max_100(self):
        """Search limit is capped at 100."""
        # Create many contracts
        for i in range(150):
            contract = TrackedContractFactory()
            ContractMetadataFactory(
                contract=contract,
                name=f"Contract {i}",
                description=f"Description {i}",
                tags=[]
            )
        
        # Try to exceed max limit
        query = """
            query {
                searchContracts(query: "Contract", limit: 150) {
                    contractId
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 100
    
    def test_search_contracts_without_metadata(self):
        """Contracts without metadata are not included in search results."""
        contract_with_metadata = TrackedContractFactory()
        contract_without_metadata = TrackedContractFactory()
        
        # Only create metadata for one contract
        metadata = ContractMetadataFactory(
            contract=contract_with_metadata,
            name="Searchable Contract",
            description="This should be found",
            tags=[]
        )
        
        query = """
            query {
                searchContracts(query: "Searchable") {
                    contractId
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        assert len(result.data["searchContracts"]) == 1
        assert result.data["searchContracts"][0]["contractId"] == contract_with_metadata.contract_id


@pytest.mark.django_db
class TestDependenciesForContractQuery:
    """Tests for the dependenciesForContract GraphQL query."""

    def test_dependencies_for_contract_with_specific_graph(self):
        """Get dependencies when contract-specific graph exists."""
        contract = TrackedContractFactory()
        
        # Create a contract-specific call graph
        call_graph = CallGraph.objects.create(
            contract=contract,
            graph_data={
                "nodes": [
                    {"id": contract.contract_id, "name": contract.name}
                ],
                "edges": [],
                "metadata": {"contract_count": 1}
            },
            has_cycles=False,
            cycle_details=None,
            computed_at=timezone.now()
        )
        
        query = """
            query($contractId: String!) {
                dependenciesForContract(contractId: $contractId) {
                    contract {
                        contractId
                    }
                    graphData
                    hasCycles
                    cycleDetails
                    computedAt
                }
            }
        """
        
        result = soroscan_schema.execute_sync(
            query,
            variable_values={"contractId": contract.contract_id}
        )
        
        assert result.errors is None
        assert result.data["dependenciesForContract"] is not None
        assert result.data["dependenciesForContract"]["contract"]["contractId"] == contract.contract_id
        assert result.data["dependenciesForContract"]["hasCycles"] is False
        assert result.data["dependenciesForContract"]["cycleDetails"] is None
    
    def test_dependencies_for_contract_falls_back_to_global_graph(self):
        """Get dependencies when no contract-specific graph exists, fall back to global."""
        contract = TrackedContractFactory()
        
        # Create only a global graph (contract=None)
        global_graph = CallGraph.objects.create(
            contract=None,
            graph_data={
                "nodes": [
                    {"id": contract.contract_id, "name": contract.name},
                    {"id": "C" + "B" * 55, "name": "Other Contract"}
                ],
                "edges": [
                    {"from": contract.contract_id, "to": "C" + "B" * 55, "callCount": 5}
                ],
                "metadata": {"contract_count": 2}
            },
            has_cycles=False,
            cycle_details=None,
            computed_at=timezone.now()
        )
        
        query = """
            query($contractId: String!) {
                dependenciesForContract(contractId: $contractId) {
                    contract {
                        contractId
                    }
                    graphData
                    hasCycles
                }
            }
        """
        
        result = soroscan_schema.execute_sync(
            query,
            variable_values={"contractId": contract.contract_id}
        )
        
        assert result.errors is None
        assert result.data["dependenciesForContract"] is not None
        # Global graph has no specific contract
        assert result.data["dependenciesForContract"]["contract"] is None
        assert result.data["dependenciesForContract"]["hasCycles"] is False
    
    def test_dependencies_for_contract_with_cycles(self):
        """Get dependencies when graph has cycles."""
        contract = TrackedContractFactory()
        
        # Create a graph with cycles
        call_graph = CallGraph.objects.create(
            contract=contract,
            graph_data={
                "nodes": [
                    {"id": contract.contract_id, "name": contract.name},
                    {"id": "C" + "B" * 55, "name": "Contract B"},
                    {"id": "C" + "C" * 55, "name": "Contract C"}
                ],
                "edges": [
                    {"from": contract.contract_id, "to": "C" + "B" * 55, "callCount": 3},
                    {"from": "C" + "B" * 55, "to": "C" + "C" * 55, "callCount": 2},
                    {"from": "C" + "C" * 55, "to": contract.contract_id, "callCount": 1}
                ],
                "metadata": {"contract_count": 3, "has_cycles": True}
            },
            has_cycles=True,
            cycle_details=[contract.contract_id, "C" + "B" * 55, "C" + "C" * 55],
            computed_at=timezone.now()
        )
        
        query = """
            query($contractId: String!) {
                dependenciesForContract(contractId: $contractId) {
                    contract {
                        contractId
                    }
                    hasCycles
                    cycleDetails
                }
            }
        """
        
        result = soroscan_schema.execute_sync(
            query,
            variable_values={"contractId": contract.contract_id}
        )
        
        assert result.errors is None
        assert result.data["dependenciesForContract"] is not None
        assert result.data["dependenciesForContract"]["hasCycles"] is True
        assert result.data["dependenciesForContract"]["cycleDetails"] == [
            contract.contract_id, "C" + "B" * 55, "C" + "C" * 55
        ]
    
    def test_dependencies_for_contract_no_graph_exists(self):
        """Return null when no graph exists (neither specific nor global)."""
        contract = TrackedContractFactory()
        
        query = """
            query($contractId: String!) {
                dependenciesForContract(contractId: $contractId) {
                    contract {
                        contractId
                    }
                }
            }
        """
        
        result = soroscan_schema.execute_sync(
            query,
            variable_values={"contractId": contract.contract_id}
        )
        
        assert result.errors is None
        # Should return null when no graph exists
        assert result.data["dependenciesForContract"] is None
    
    def test_dependencies_for_contract_returns_graph_data_structure(self):
        """Verify the graph data structure is correctly returned."""
        contract = TrackedContractFactory()
        
        graph_data = {
            "nodes": [
                {"id": contract.contract_id, "name": contract.name, "type": "contract"},
                {"id": "C" + "B" * 55, "name": "Dependency A", "type": "contract"},
                {"id": "C" + "C" * 55, "name": "Dependency B", "type": "contract"}
            ],
            "edges": [
                {"from": contract.contract_id, "to": "C" + "B" * 55, "callCount": 10, "riskScore": 0.5},
                {"from": contract.contract_id, "to": "C" + "C" * 55, "callCount": 5, "riskScore": 0.2},
                {"from": "C" + "B" * 55, "to": "C" + "C" * 55, "callCount": 3, "riskScore": 0.1}
            ],
            "metadata": {
                "contract_count": 3,
                "edge_count": 3,
                "computed_at": "2024-01-01T00:00:00Z"
            }
        }
        
        call_graph = CallGraph.objects.create(
            contract=contract,
            graph_data=graph_data,
            has_cycles=False,
            cycle_details=None,
            computed_at=timezone.now()
        )
        
        query = """
            query($contractId: String!) {
                dependenciesForContract(contractId: $contractId) {
                    graphData
                }
            }
        """
        
        result = soroscan_schema.execute_sync(
            query,
            variable_values={"contractId": contract.contract_id}
        )
        
        assert result.errors is None
        assert result.data["dependenciesForContract"]["graphData"] == graph_data
    
    def test_dependencies_for_contract_prefers_specific_over_global(self):
        """When both specific and global graphs exist, prefer specific."""
        contract = TrackedContractFactory()
        
        # Create both specific and global graphs
        specific_graph = CallGraph.objects.create(
            contract=contract,
            graph_data={
                "nodes": [{"id": contract.contract_id, "name": "Specific Graph"}],
                "edges": [],
                "metadata": {"type": "specific"}
            },
            has_cycles=False,
            cycle_details=None,
            computed_at=timezone.now()
        )
        
        global_graph = CallGraph.objects.create(
            contract=None,
            graph_data={
                "nodes": [{"id": contract.contract_id, "name": "Global Graph"}],
                "edges": [],
                "metadata": {"type": "global"}
            },
            has_cycles=False,
            cycle_details=None,
            computed_at=timezone.now()
        )
        
        query = """
            query($contractId: String!) {
                dependenciesForContract(contractId: $contractId) {
                    contract {
                        contractId
                    }
                    graphData
                }
            }
        """
        
        result = soroscan_schema.execute_sync(
            query,
            variable_values={"contractId": contract.contract_id}
        )
        
        assert result.errors is None
        assert result.data["dependenciesForContract"] is not None
        # Should return specific graph
        assert result.data["dependenciesForContract"]["contract"]["contractId"] == contract.contract_id
        assert result.data["dependenciesForContract"]["graphData"]["metadata"]["type"] == "specific"

    
    def test_dependencies_for_unknown_contract(self):
        """Return null for unknown contract when no graphs exist."""
        unknown_contract_id = "C" + "X" * 55  # Valid format but not in DB
        
        query = """
            query($contractId: String!) {
                dependenciesForContract(contractId: $contractId) {
                    contract {
                        contractId
                    }
                }
            }
        """
        
        result = soroscan_schema.execute_sync(
            query,
            variable_values={"contractId": unknown_contract_id}
        )
        
        assert result.errors is None
        # Should return null when contract doesn't exist and no graphs exist
        assert result.data["dependenciesForContract"] is None

    
    def test_search_contracts_no_ownership_filtering(self):
        """Search returns contracts regardless of ownership (public feature)."""
        # Create two contracts with different owners
        contract1 = TrackedContractFactory(name="Public Contract")
        contract2 = TrackedContractFactory(name="Another Public Contract")
        
        # Both have metadata
        metadata1 = ContractMetadataFactory(
            contract=contract1,
            name="Public Contract",
            description="Publicly searchable",
            tags=["public"]
        )
        metadata2 = ContractMetadataFactory(
            contract=contract2,
            name="Another Public Contract",
            description="Also publicly searchable",
            tags=["public"]
        )
        
        # Search should return both regardless of ownership
        query = """
            query {
                searchContracts(query: "Public") {
                    contractId
                    name
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        # Should return both contracts (no ownership filtering in search_contracts)
        assert len(result.data["searchContracts"]) == 2
        contract_ids = {c["contractId"] for c in result.data["searchContracts"]}
        assert contract_ids == {contract1.contract_id, contract2.contract_id}

    
    def test_search_contracts_multiple_tags(self):
        """Search contracts with multiple tags (AND logic)."""
        contract1 = TrackedContractFactory()
        contract2 = TrackedContractFactory()
        contract3 = TrackedContractFactory()
        
        metadata1 = ContractMetadataFactory(
            contract=contract1,
            name="Contract A",
            description="Test",
            tags=["defi", "lending", "ethereum"]
        )
        metadata2 = ContractMetadataFactory(
            contract=contract2,
            name="Contract B",
            description="Test",
            tags=["defi", "dex", "polygon"]
        )
        metadata3 = ContractMetadataFactory(
            contract=contract3,
            name="Contract C",
            description="Test",
            tags=["lending", "ethereum"]  # Missing "defi"
        )
        
        # Search for contracts with BOTH "defi" AND "ethereum" tags
        query = """
            query {
                searchContracts(tags: ["defi", "ethereum"]) {
                    contractId
                    metadata {
                        name
                        tags
                    }
                }
            }
        """
        
        result = soroscan_schema.execute_sync(query)
        
        assert result.errors is None
        # Should only return contract1 (has both defi and ethereum)
        assert len(result.data["searchContracts"]) == 1
        assert result.data["searchContracts"][0]["metadata"]["name"] == "Contract A"