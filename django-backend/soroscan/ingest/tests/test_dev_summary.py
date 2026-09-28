"""
Tests for GET /api/dev/summary/
"""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def client():
    return APIClient()


@pytest.mark.django_db
def test_dev_summary_returns_200(client):
    url = reverse("dev-summary")
    response = client.get(url)
    assert response.status_code == 200


@pytest.mark.django_db
def test_dev_summary_shape(client):
    url = reverse("dev-summary")
    data = client.get(url).json()

    assert "unfinished_issues" in data
    assert "active_contributors" in data
    assert "recent_prs" in data


@pytest.mark.django_db
def test_dev_summary_unfinished_issues(client):
    data = client.get(reverse("dev-summary")).json()
    issues = data["unfinished_issues"]

    assert isinstance(issues["count"], int)
    assert issues["count"] >= 0
    assert isinstance(issues["source"], str)
    assert issues["source"]  # non-empty


@pytest.mark.django_db
def test_dev_summary_active_contributors(client):
    data = client.get(reverse("dev-summary")).json()
    assert isinstance(data["active_contributors"], int)
    assert data["active_contributors"] >= 0


@pytest.mark.django_db
def test_dev_summary_recent_prs(client):
    data = client.get(reverse("dev-summary")).json()
    prs = data["recent_prs"]

    assert isinstance(prs, list)
    assert len(prs) > 0
    for pr in prs:
        assert "id" in pr
        assert "title" in pr
        assert "state" in pr
        assert "author" in pr


@pytest.mark.django_db
def test_dev_summary_no_auth_required(client):
    """Endpoint must be publicly accessible — no credentials needed."""
    url = reverse("dev-summary")
    response = client.get(url)
    assert response.status_code == 200
