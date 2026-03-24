"""
URL configuration for SoroScan project.

GraphQL versioning
------------------
/graphql/      — v1 (default, backwards-compatible, deprecated fields present)
/graphql/v1/   — v1 explicit endpoint
/graphql/v2/   — v2 endpoint (deprecated fields removed)
"""
from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

from soroscan.graphql_views import GraphQLViewV1, GraphQLViewV2, ThrottledGraphQLView
from soroscan.ingest.schema import schema_v1, schema_v2

urlpatterns = [
    # Prometheus metrics — unauthenticated; placed before any auth middleware.
    path("", include("django_prometheus.urls")),

    path("admin/", admin.site.urls),
    path("api/ingest/", include("soroscan.ingest.urls")),

    # GraphQL — versioned endpoints
    # /graphql/ and /graphql/v1/ both serve the v1 schema (backwards-compatible)
    path(
        "graphql/",
        GraphQLViewV1.as_view(schema=schema_v1),
        name="graphql-default",
    ),
    path(
        "graphql/v1/",
        GraphQLViewV1.as_view(schema=schema_v1),
        name="graphql-v1",
    ),
    path(
        "graphql/v2/",
        GraphQLViewV2.as_view(schema=schema_v2),
        name="graphql-v2",
    ),

    # JWT Authentication
    path("api/token/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    # OpenAPI Schema & Docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

# Silk profiling UI — available only when ENABLE_SILK is set
if getattr(settings, "ENABLE_SILK", False):
    urlpatterns += [path("silk/", include("silk.urls", namespace="silk"))]
