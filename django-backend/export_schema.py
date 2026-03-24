"""
Export the v1 and v2 GraphQL schemas to SDL files for CI schema diffing.

Usage:
    DJANGO_SETTINGS_MODULE=soroscan.settings_test python export_schema.py
"""
import django
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "soroscan.settings_test")
django.setup()

from soroscan.ingest.schema import schema_v1, schema_v2  # noqa: E402

with open("schema_v1.graphql", "w") as f:
    f.write(schema_v1.as_str())
    print("Exported schema_v1.graphql")

with open("schema_v2.graphql", "w") as f:
    f.write(schema_v2.as_str())
    print("Exported schema_v2.graphql")
