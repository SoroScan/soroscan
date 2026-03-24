"""
Integration tests for issue #105: GraphQL API versioning.

Covers:
- v1 schema has deprecated fields (eventCount, recentErrors)
- v2 schema does NOT have deprecated fields
- Both /graphql/v1/ and /graphql/v2/ endpoints respond correctly
- X-GraphQL-Schema-Version header is set on responses
- GraphQLDeprecationMiddleware adds X-GraphQL-Deprecations header
- Deprecation reasons contain sunset dates
"""
import json
import pytest
from django.contrib.auth import get_user_model
from django.test import Client, RequestFactory
from unittest.mock import patch, MagicMock

from soroscan.ingest.schema import schema_v1, schema_v2, SCHEMA_VERSION_V1, SCHEMA_VERSION_V2
from soroscan.ingest.middleware import GraphQLDeprecationMiddleware, _collect_deprecated_fields

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def user(db):
    return User.objects.create_user(username="schematest", password="pass", is_staff=True)


@pytest.fixture
def client_auth(user):
    c = Client()
    c.force_login(user)
    return c


# ---------------------------------------------------------------------------
# Schema introspection helpers
# ---------------------------------------------------------------------------

def _field_names(schema, type_name: str) -> set[str]:
    """Return the set of field names for a GraphQL type in the given schema."""
    result = schema.execute_sync(
        f"""
        {{
          __type(name: "{type_name}") {{
            fields(includeDeprecated: true) {{
              name
              isDeprecated
              deprecationReason
            }}
          }}
        }}
        """
    )
    assert result.errors is None, result.errors
    fields = result.data["__type"]["fields"] or []
    return {f["name"] for f in fields}


def _deprecated_fields(schema, type_name: str) -> dict[str, str]:
    """Return {fieldName: deprecationReason} for deprecated fields on a type."""
    result = schema.execute_sync(
        f"""
        {{
          __type(name: "{type_name}") {{
            fields(includeDeprecated: true) {{
              name
              isDeprecated
              deprecationReason
            }}
          }}
        }}
        """
    )
    assert result.errors is None, result.errors
    fields = result.data["__type"]["fields"] or []
    return {
        f["name"]: f["deprecationReason"]
        for f in fields
        if f["isDeprecated"]
    }


# ---------------------------------------------------------------------------
# Schema structure tests
# ---------------------------------------------------------------------------

class TestSchemaV1Structure:
    def test_contract_type_has_event_count(self):
        names = _field_names(schema_v1, "ContractType")
        assert "eventCount" in names

    def test_event_count_is_deprecated(self):
        deprecated = _deprecated_fields(schema_v1, "ContractType")
        assert "eventCount" in deprecated

    def test_event_count_deprecation_has_sunset_date(self):
        deprecated = _deprecated_fields(schema_v1, "ContractType")
        reason = deprecated["eventCount"]
        assert "2026-12-31" in reason

    def test_query_has_recent_errors(self):
        names = _field_names(schema_v1, "Query")
        assert "recentErrors" in names

    def test_recent_errors_is_deprecated(self):
        deprecated = _deprecated_fields(schema_v1, "Query")
        assert "recentErrors" in deprecated

    def test_recent_errors_deprecation_has_sunset_date(self):
        deprecated = _deprecated_fields(schema_v1, "Query")
        reason = deprecated["recentErrors"]
        assert "2026-12-31" in reason

    def test_non_deprecated_fields_present(self):
        names = _field_names(schema_v1, "Query")
        assert "contracts" in names
        assert "events" in names
        assert "contractStats" in names


class TestSchemaV2Structure:
    def test_contract_type_has_no_event_count(self):
        names = _field_names(schema_v2, "ContractTypeV2")
        assert "eventCount" not in names

    def test_query_has_no_recent_errors(self):
        # v2 query type is named QueryV2
        names = _field_names(schema_v2, "QueryV2")
        assert "recentErrors" not in names

    def test_core_fields_still_present(self):
        names = _field_names(schema_v2, "QueryV2")
        assert "contracts" in names
        assert "events" in names
        assert "contractStats" in names
        assert "systemMetrics" in names

    def test_v2_has_no_deprecated_fields_on_query(self):
        deprecated = _deprecated_fields(schema_v2, "QueryV2")
        assert deprecated == {}


# ---------------------------------------------------------------------------
# Versioned endpoint tests
# ---------------------------------------------------------------------------

INTROSPECT_QUERY = json.dumps({
    "query": "{ __schema { queryType { name } } }"
})


@pytest.mark.django_db
class TestVersionedEndpoints:
    def test_v1_endpoint_returns_200(self, client_auth):
        resp = client_auth.post(
            "/graphql/v1/",
            data=INTROSPECT_QUERY,
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_v2_endpoint_returns_200(self, client_auth):
        resp = client_auth.post(
            "/graphql/v2/",
            data=INTROSPECT_QUERY,
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_default_endpoint_returns_200(self, client_auth):
        resp = client_auth.post(
            "/graphql/",
            data=INTROSPECT_QUERY,
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_v1_schema_version_header(self, client_auth):
        resp = client_auth.post(
            "/graphql/v1/",
            data=INTROSPECT_QUERY,
            content_type="application/json",
        )
        assert resp.get("X-GraphQL-Schema-Version") == SCHEMA_VERSION_V1

    def test_v2_schema_version_header(self, client_auth):
        resp = client_auth.post(
            "/graphql/v2/",
            data=INTROSPECT_QUERY,
            content_type="application/json",
        )
        assert resp.get("X-GraphQL-Schema-Version") == SCHEMA_VERSION_V2

    def test_v1_and_v2_work_independently(self, client_auth):
        """Both endpoints respond with valid GraphQL JSON."""
        expected_names = {
            "/graphql/v1/": "Query",
            "/graphql/v2/": "QueryV2",
        }
        for path, expected_name in expected_names.items():
            resp = client_auth.post(
                path,
                data=INTROSPECT_QUERY,
                content_type="application/json",
            )
            data = resp.json()
            assert "data" in data
            assert data["data"]["__schema"]["queryType"]["name"] == expected_name


# ---------------------------------------------------------------------------
# Deprecation middleware tests
# ---------------------------------------------------------------------------

class TestGraphQLDeprecationMiddleware:
    def _make_response(self, body: dict, content_type="application/json"):
        from django.http import HttpResponse
        resp = HttpResponse(
            json.dumps(body),
            content_type=content_type,
        )
        return resp

    def _make_request(self, path="/graphql/v1/", method="POST"):
        factory = RequestFactory()
        if method == "POST":
            return factory.post(path, content_type="application/json")
        return factory.get(path)

    def test_adds_deprecations_header_when_extensions_present(self):
        body = {
            "data": {},
            "extensions": {
                "deprecations": [
                    {"field": "eventCount"},
                    {"field": "recentErrors"},
                ]
            },
        }
        middleware = GraphQLDeprecationMiddleware(lambda r: self._make_response(body))
        request = self._make_request()
        response = middleware(request)
        header = response.get("X-GraphQL-Deprecations", "")
        assert "eventCount" in header
        assert "recentErrors" in header

    def test_no_header_when_no_deprecations(self):
        body = {"data": {}}
        middleware = GraphQLDeprecationMiddleware(lambda r: self._make_response(body))
        request = self._make_request()
        response = middleware(request)
        assert response.get("X-GraphQL-Deprecations") is None

    def test_skips_non_graphql_paths(self):
        body = {
            "data": {},
            "extensions": {"deprecations": [{"field": "eventCount"}]},
        }
        middleware = GraphQLDeprecationMiddleware(lambda r: self._make_response(body))
        request = self._make_request(path="/api/ingest/contracts/")
        response = middleware(request)
        assert response.get("X-GraphQL-Deprecations") is None

    def test_skips_get_requests(self):
        body = {
            "data": {},
            "extensions": {"deprecations": [{"field": "eventCount"}]},
        }
        middleware = GraphQLDeprecationMiddleware(lambda r: self._make_response(body))
        request = self._make_request(method="GET")
        response = middleware(request)
        assert response.get("X-GraphQL-Deprecations") is None

    def test_attaches_schema_version_header(self):
        body = {"data": {}}
        middleware = GraphQLDeprecationMiddleware(lambda r: self._make_response(body))
        request = self._make_request()
        request._graphql_schema_version = "v2"
        response = middleware(request)
        assert response.get("X-GraphQL-Schema-Version") == "v2"

    def test_collect_deprecated_fields_from_extensions(self):
        data = {
            "extensions": {
                "deprecations": [
                    {"field": "eventCount"},
                    "recentErrors",
                ]
            }
        }
        fields = _collect_deprecated_fields(data)
        assert "eventCount" in fields
        assert "recentErrors" in fields

    def test_collect_deprecated_fields_empty_on_clean_response(self):
        fields = _collect_deprecated_fields({"data": {"contracts": []}})
        assert fields == set()

    def test_sentry_reporting_skipped_when_no_dsn(self):
        """Should not raise even when Sentry is not configured."""
        body = {
            "data": {},
            "extensions": {"deprecations": [{"field": "eventCount"}]},
        }
        middleware = GraphQLDeprecationMiddleware(lambda r: self._make_response(body))
        request = self._make_request()
        # Should complete without error
        response = middleware(request)
        assert response.status_code == 200

    def test_sentry_reporting_called_when_dsn_set(self):
        body = {
            "data": {},
            "extensions": {"deprecations": [{"field": "eventCount"}]},
        }
        middleware = GraphQLDeprecationMiddleware(lambda r: self._make_response(body))
        request = self._make_request()

        with patch("soroscan.ingest.middleware.settings") as mock_settings:
            mock_settings.SENTRY_DSN = "https://fake@sentry.io/1"
            with patch("soroscan.ingest.middleware._report_to_sentry") as mock_report:
                middleware(request)
                mock_report.assert_called_once()
