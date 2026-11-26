import logging
import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.signals import user_logged_in, user_login_failed
from django.test import RequestFactory

from soroscan.ingest.models import Organization, TrackedContract
from soroscan.ingest.signals import (
    _get_client_ip,
    invalidate_contract_on_update,
    invalidate_org_cors_cache_on_change,
    on_user_logged_in,
    on_user_login_failed,
)
from .factories import TrackedContractFactory, UserFactory

User = get_user_model()


@pytest.fixture
def rf():
    return RequestFactory()


# --- _get_client_ip tests ---


def test_get_client_ip_none():
    assert _get_client_ip(None) == "unknown"


def test_get_client_ip_x_forwarded_for_multiple_hops(rf):
    request = rf.get("/", HTTP_X_FORWARDED_FOR="203.0.113.195, 70.41.3.18, 150.172.238.178")
    assert _get_client_ip(request) == "203.0.113.195"


def test_get_client_ip_x_forwarded_for_single_hop(rf):
    request = rf.get("/", HTTP_X_FORWARDED_FOR="198.51.100.2")
    assert _get_client_ip(request) == "198.51.100.2"


def test_get_client_ip_remote_addr_fallback(rf):
    request = rf.get("/", REMOTE_ADDR="192.168.1.100")
    assert _get_client_ip(request) == "192.168.1.100"


def test_get_client_ip_missing_both(rf):
    request = rf.get("/")
    request.META.pop("REMOTE_ADDR", None)
    assert _get_client_ip(request) == "unknown"


# --- Authentication signals logging tests ---


def test_on_user_logged_in_direct(caplog, rf):
    user = UserFactory.build(username="alice")
    request = rf.get("/", REMOTE_ADDR="10.0.0.5")

    with caplog.at_level(logging.INFO, logger="soroscan.security_audit"):
        on_user_logged_in(sender=User, request=request, user=user)

    assert "LOGIN_SUCCESS username=alice ip=10.0.0.5" in caplog.text


def test_on_user_logged_in_fallback_str_user_and_none_request(caplog):
    class FakeUser:
        def __str__(self):
            return "str-representation-user"

    with caplog.at_level(logging.INFO, logger="soroscan.security_audit"):
        on_user_logged_in(sender=None, request=None, user=FakeUser())

    assert "LOGIN_SUCCESS username=str-representation-user ip=unknown" in caplog.text


@pytest.mark.django_db
def test_on_user_logged_in_signal_dispatch(caplog, rf):
    user = UserFactory(username="bob")
    request = rf.get("/", HTTP_X_FORWARDED_FOR="198.51.100.44")

    with caplog.at_level(logging.INFO, logger="soroscan.security_audit"):
        user_logged_in.send(sender=User, request=request, user=user)

    assert "LOGIN_SUCCESS username=bob ip=198.51.100.44" in caplog.text


def test_on_user_login_failed_direct(caplog, rf):
    request = rf.get("/", REMOTE_ADDR="192.0.2.1")
    credentials = {"username": "eve", "password": "wrongpassword"}

    with caplog.at_level(logging.WARNING, logger="soroscan.security_audit"):
        on_user_login_failed(sender=None, credentials=credentials, request=request)

    assert "LOGIN_FAILED username=eve ip=192.0.2.1" in caplog.text


def test_on_user_login_failed_missing_username_and_request(caplog):
    with caplog.at_level(logging.WARNING, logger="soroscan.security_audit"):
        on_user_login_failed(sender=None, credentials={}, request=None)

    assert "LOGIN_FAILED username=unknown ip=unknown" in caplog.text


def test_on_user_login_failed_signal_dispatch(caplog, rf):
    request = rf.get("/", HTTP_X_FORWARDED_FOR="198.51.100.99, 10.0.0.1")

    with caplog.at_level(logging.WARNING, logger="soroscan.security_audit"):
        user_login_failed.send(
            sender=None,
            credentials={"username": "mallory"},
            request=request,
        )

    assert "LOGIN_FAILED username=mallory ip=198.51.100.99" in caplog.text


# --- Cache invalidation signal tests ---


@pytest.mark.django_db
def test_invalidate_contract_on_save(mocker):
    user = UserFactory()
    mock_invalidate = mocker.patch("soroscan.ingest.signals.invalidate_cached_contract")

    contract = TrackedContractFactory(owner=user, contract_id="CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")

    mock_invalidate.assert_called_with("CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA")


@pytest.mark.django_db
def test_invalidate_contract_on_delete(mocker):
    user = UserFactory()
    contract = TrackedContractFactory(owner=user, contract_id="CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB")
    mock_invalidate = mocker.patch("soroscan.ingest.signals.invalidate_cached_contract")

    contract.delete()

    mock_invalidate.assert_called_with("CBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB")


def test_invalidate_contract_without_contract_id(mocker):
    mock_invalidate = mocker.patch("soroscan.ingest.signals.invalidate_cached_contract")
    fake_contract = TrackedContract(contract_id="")

    invalidate_contract_on_update(sender=TrackedContract, instance=fake_contract)

    mock_invalidate.assert_not_called()


@pytest.mark.django_db
def test_invalidate_org_cors_cache_on_save(mocker):
    user = UserFactory()
    mock_invalidate = mocker.patch("soroscan.cors_middleware.invalidate_org_cors_cache")

    org = Organization.objects.create(name="Signal Test Org", owner=user)

    mock_invalidate.assert_called()


@pytest.mark.django_db
def test_invalidate_org_cors_cache_on_delete(mocker):
    user = UserFactory()
    org = Organization.objects.create(name="Signal Delete Org", owner=user)
    mock_invalidate = mocker.patch("soroscan.cors_middleware.invalidate_org_cors_cache")

    org.delete()

    mock_invalidate.assert_called()


@pytest.mark.django_db
def test_invalidate_org_cors_cache_exception_handling(mocker):
    user = UserFactory()
    mocker.patch(
        "soroscan.cors_middleware.invalidate_org_cors_cache",
        side_effect=RuntimeError("Redis down"),
    )

    # Should not raise exception
    org = Organization.objects.create(name="Safe Org", owner=user)
    assert org.pk is not None
    org.delete()
