import json
import pytest
from django.test import Client, RequestFactory, override_settings
from django.urls import path

from soroscan.error_handlers import custom_404, custom_500
from soroscan.urls import handler404_view, handler500_view


def boom(request):
    raise RuntimeError("deliberate error")


# Minimal urlconf used for the 500 test
urlpatterns = [path("test-500/", boom)]
handler404 = handler404_view
handler500 = handler500_view


@pytest.fixture
def rf():
    return RequestFactory()


@pytest.fixture
def client():
    return Client(raise_request_exception=False)


def test_custom_404_direct_without_request_id(rf):
    request = rf.get("/non-existent/")
    response = custom_404(request)

    assert response.status_code == 404
    assert response["Content-Type"] == "application/json"
    data = json.loads(response.content)
    assert set(data.keys()) == {"error", "status", "message", "request_id"}
    assert data["error"] == "Not found"
    assert data["status"] == 404
    assert data["message"] == "The requested resource was not found."
    assert data["request_id"] is None


def test_custom_404_direct_with_request_id(rf):
    request = rf.get("/non-existent/")
    request.request_id = "custom-req-id-404"
    exception = Exception("Page does not exist")
    response = custom_404(request, exception=exception)

    assert response.status_code == 404
    assert response["Content-Type"] == "application/json"
    data = json.loads(response.content)
    assert set(data.keys()) == {"error", "status", "message", "request_id"}
    assert data["error"] == "Not found"
    assert data["status"] == 404
    assert data["message"] == "The requested resource was not found."
    assert data["request_id"] == "custom-req-id-404"


def test_custom_500_direct_without_request_id(rf):
    request = rf.get("/server-error/")
    response = custom_500(request)

    assert response.status_code == 500
    assert response["Content-Type"] == "application/json"
    data = json.loads(response.content)
    assert set(data.keys()) == {"error", "status", "message", "request_id"}
    assert data["error"] == "Internal server error"
    assert data["status"] == 500
    assert data["message"] == "An unexpected error occurred on the server."
    assert data["request_id"] is None


def test_custom_500_direct_with_request_id(rf):
    request = rf.get("/server-error/")
    request.request_id = "custom-req-id-500"
    response = custom_500(request)

    assert response.status_code == 500
    assert response["Content-Type"] == "application/json"
    data = json.loads(response.content)
    assert set(data.keys()) == {"error", "status", "message", "request_id"}
    assert data["error"] == "Internal server error"
    assert data["status"] == 500
    assert data["message"] == "An unexpected error occurred on the server."
    assert data["request_id"] == "custom-req-id-500"


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_unknown_url_returns_json_404(client):
    response = client.get("/api/unknown-endpoint-404/")
    assert response.status_code == 404
    assert response["Content-Type"] == "application/json"
    data = response.json()
    assert set(data.keys()) == {"error", "status", "message", "request_id"}
    assert data["error"] == "Not found"
    assert data["status"] == 404
    assert data["message"] == "The requested resource was not found."
    assert "request_id" in data


@pytest.mark.django_db
@override_settings(DEBUG=False, ROOT_URLCONF=__name__)
def test_500_returns_json(client):
    response = client.get("/test-500/")
    assert response.status_code == 500
    assert response["Content-Type"] == "application/json"
    data = response.json()
    assert set(data.keys()) == {"error", "status", "message", "request_id"}
    assert data["error"] == "Internal server error"
    assert data["status"] == 500
    assert data["message"] == "An unexpected error occurred on the server."
    assert "request_id" in data
