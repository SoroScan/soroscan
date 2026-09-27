import pytest
from unittest.mock import patch
from django.core.cache import cache
from soroscan.ingest.cache_utils import get_cached_contract, contract_cache_key
from soroscan.ingest.tests.factories import TrackedContractFactory

@pytest.mark.django_db
def test_contract_caching():
    contract = TrackedContractFactory()
    
    # clear cache
    cache.clear()
    
    # 1. Miss cache, hit DB
    with patch("soroscan.ingest.cache_utils.TrackedContract.objects.get") as mock_get:
        mock_get.return_value = contract
        cached_contract = get_cached_contract(contract.contract_id)
        assert cached_contract == contract
        assert mock_get.call_count == 1
        
    # 2. Hit cache, no DB
    with patch("soroscan.ingest.cache_utils.TrackedContract.objects.get") as mock_get:
        cached_contract = get_cached_contract(contract.contract_id)
        assert cached_contract == contract
        assert mock_get.call_count == 0
        
    # 3. Invalidate on save
    contract.name = "Updated Name"
    contract.save()
    
    assert cache.get(contract_cache_key(contract.contract_id)) is None
    
    # Put back in cache
    get_cached_contract(contract.contract_id)
    assert cache.get(contract_cache_key(contract.contract_id)) is not None
    
    # 4. Invalidate on delete
    contract.delete()
    assert cache.get(contract_cache_key(contract.contract_id)) is None
