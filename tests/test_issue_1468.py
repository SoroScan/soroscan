"""Regression tests for issue #1468.

Ensures every public method of the Python SDK client classes in
``sdk/python/soroscan/client.py`` carries a PEP 257 docstring that documents
its parameters, return type, and raised exceptions.
"""

import inspect
import os
import sys
import unittest

sys.path.insert(
    0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "sdk", "python")
)

from soroscan.client import AsyncSoroScanClient, SoroScanClient  # noqa: E402

CLIENT_CLASSES = (SoroScanClient, AsyncSoroScanClient)

# Public methods that never perform an API call and therefore raise no
# SoroScanAPIError (context-managed teardown and query-builder factories).
NON_API_METHODS = {"close", "events", "contracts", "webhooks"}


def _public_methods(cls):
    """Return {name: function} for all public methods of ``cls``."""
    return {
        name: member
        for name, member in inspect.getmembers(cls, predicate=inspect.isfunction)
        if not name.startswith("_")
    }


class TestClientDocstringsIssue1468(unittest.TestCase):
    """All public client methods must have complete PEP 257 docstrings."""

    def test_all_public_methods_have_docstrings(self):
        for cls in CLIENT_CLASSES:
            methods = _public_methods(cls)
            self.assertTrue(methods, f"{cls.__name__} exposes no public methods")
            for name, method in methods.items():
                with self.subTest(client=cls.__name__, method=name):
                    self.assertIsNotNone(
                        method.__doc__,
                        f"{cls.__name__}.{name} is missing a docstring",
                    )
                    self.assertTrue(
                        method.__doc__.strip(),
                        f"{cls.__name__}.{name} has an empty docstring",
                    )

    def test_docstrings_document_parameters(self):
        for cls in CLIENT_CLASSES:
            for name, method in _public_methods(cls).items():
                params = [
                    p
                    for p in inspect.signature(method).parameters.values()
                    if p.name != "self"
                ]
                if not params:
                    continue
                with self.subTest(client=cls.__name__, method=name):
                    self.assertIn(
                        "Args:",
                        method.__doc__,
                        f"{cls.__name__}.{name} lacks an Args section",
                    )
                    for param in params:
                        self.assertIn(
                            f"{param.name}:",
                            method.__doc__,
                            f"{cls.__name__}.{name} does not document "
                            f"parameter '{param.name}'",
                        )

    def test_docstrings_document_return_types(self):
        for cls in CLIENT_CLASSES:
            for name, method in _public_methods(cls).items():
                returns = inspect.signature(method).return_annotation
                if returns is inspect.Signature.empty or returns is None:
                    continue
                with self.subTest(client=cls.__name__, method=name):
                    self.assertIn(
                        "Returns:",
                        method.__doc__,
                        f"{cls.__name__}.{name} lacks a Returns section",
                    )

    def test_api_methods_document_exceptions(self):
        for cls in CLIENT_CLASSES:
            for name, method in _public_methods(cls).items():
                if name in NON_API_METHODS:
                    continue
                with self.subTest(client=cls.__name__, method=name):
                    self.assertIn(
                        "Raises:",
                        method.__doc__,
                        f"{cls.__name__}.{name} lacks a Raises section",
                    )
                    self.assertIn(
                        "SoroScanAPIError",
                        method.__doc__,
                        f"{cls.__name__}.{name} does not document "
                        "SoroScanAPIError",
                    )

    def test_docstrings_follow_pep257_summary_convention(self):
        for cls in CLIENT_CLASSES:
            for name, method in _public_methods(cls).items():
                with self.subTest(client=cls.__name__, method=name):
                    summary = method.__doc__.strip().splitlines()[0].strip()
                    self.assertTrue(
                        summary.endswith("."),
                        f"{cls.__name__}.{name} summary line must end "
                        "with a period (PEP 257)",
                    )


if __name__ == "__main__":
    unittest.main()
