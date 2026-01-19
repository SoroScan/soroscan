"""
URL configuration for SoroScan project.
"""
from django.contrib import admin
from django.urls import include, path
from strawberry.django.views import GraphQLView

from soroscan.ingest.schema import schema

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/ingest/", include("soroscan.ingest.urls")),
    path("graphql/", GraphQLView.as_view(schema=schema)),
]
