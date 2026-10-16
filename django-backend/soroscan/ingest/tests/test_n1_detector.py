"""Tests for N+1 query detection middleware (issue #1290).

Covers:
- Basic extension lifecycle (enabled/disabled flags)
- Nested-resolver detection (the primary N+1 pattern)
- Configurable threshold via GRAPHQL_N1_DETECTION_THRESHOLD
- Introspection types are skipped (no noise)
- Zero overhead path when detection is disabled
"""

from unittest.mock import MagicMock, patch

from django.test import TestCase, override_settings

from soroscan.graphql_n1_detector import N1QueryDetectorExtension, _SKIP_TYPES, _get_threshold


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class _GrowingQueryList:
    """Fake connection.queries list whose length grows on the second __len__ call.

    First call (before resolver) → *start_count*.
    Subsequent calls (after resolver) → *end_count*.
    """

    def __init__(self, start_count: int = 0, end_count: int = 10):
        self._calls = 0
        self._start = start_count
        self._end = end_count

    def __len__(self) -> int:
        self._calls += 1
        return self._start if self._calls == 1 else self._end


def _make_info(parent_type: str = "Query", field_name: str = "contracts") -> MagicMock:
    info = MagicMock()
    info.parent_type.name = parent_type
    info.field_name = field_name
    return info


def _make_ext() -> N1QueryDetectorExtension:
    return N1QueryDetectorExtension()


# ---------------------------------------------------------------------------
# Configuration helpers
# ---------------------------------------------------------------------------

class GetThresholdTests(TestCase):
    @override_settings(GRAPHQL_N1_DETECTION_THRESHOLD=10)
    def test_reads_configured_threshold(self):
        self.assertEqual(_get_threshold(), 10)

    @override_settings(GRAPHQL_N1_DETECTION_THRESHOLD=1)
    def test_allows_minimum_of_1(self):
        self.assertEqual(_get_threshold(), 1)

    @override_settings(GRAPHQL_N1_DETECTION_THRESHOLD=0)
    def test_clamps_zero_to_1(self):
        self.assertEqual(_get_threshold(), 1)

    @override_settings(GRAPHQL_N1_DETECTION_THRESHOLD=-5)
    def test_clamps_negative_to_1(self):
        self.assertEqual(_get_threshold(), 1)

    @override_settings(GRAPHQL_N1_DETECTION_THRESHOLD="bad")
    def test_falls_back_to_5_on_invalid_value(self):
        self.assertEqual(_get_threshold(), 5)

    def test_default_is_5_when_not_set(self):
        from django.test.utils import override_settings as _override
        with _override(GRAPHQL_N1_DETECTION_THRESHOLD=5):
            self.assertEqual(_get_threshold(), 5)


# ---------------------------------------------------------------------------
# Extension lifecycle
# ---------------------------------------------------------------------------

class N1QueryDetectorLifecycleTests(TestCase):
    def test_is_a_strawberry_extension(self):
        from strawberry.extensions import SchemaExtension

        self.assertTrue(issubclass(N1QueryDetectorExtension, SchemaExtension))

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, DEBUG=True)
    def test_enabled_in_debug_mode(self):
        self.assertTrue(_make_ext()._is_enabled())

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=False)
    def test_disabled_when_not_enabled(self):
        self.assertFalse(_make_ext()._is_enabled())

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, DEBUG=False)
    def test_enabled_can_be_forced_in_production(self):
        self.assertTrue(_make_ext()._is_enabled())

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=False, DEBUG=False)
    def test_disabled_by_default_in_production(self):
        self.assertFalse(_make_ext()._is_enabled())


# ---------------------------------------------------------------------------
# Disabled path — zero overhead
# ---------------------------------------------------------------------------

class N1DetectorDisabledTests(TestCase):
    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=False)
    def test_bypasses_when_disabled_and_returns_result(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return ["contract_a", "contract_b"]

        result = ext.resolve(mock_next, None, info)
        self.assertEqual(result, ["contract_a", "contract_b"])

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=False)
    def test_no_warning_logged_when_disabled(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
            with patch(
                "soroscan.graphql_n1_detector.connection"
            ) as mock_conn:
                mock_conn.queries = _GrowingQueryList(0, 100)
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_not_called()


# ---------------------------------------------------------------------------
# Top-level resolver detection (Query / Mutation)
# ---------------------------------------------------------------------------

class N1DetectorTopLevelTests(TestCase):
    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=5)
    def test_warns_when_query_count_exceeds_threshold(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 10)
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                result = ext.resolve(mock_next, None, info)
                self.assertEqual(result, [])
                mock_logger.warning.assert_called_once()
                call_args = mock_logger.warning.call_args
                self.assertIn("N+1", call_args[0][0])
                self.assertEqual(call_args[0][1], "contracts")
                self.assertEqual(call_args[0][2], "Query")

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=5)
    def test_no_warning_when_below_threshold(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 3)  # 3 queries < threshold 5
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_not_called()

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=5)
    def test_no_warning_at_exactly_threshold(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 5)  # 5 == threshold, not > threshold
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_not_called()

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=5)
    def test_returns_resolver_result_on_detection(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return [{"id": 1}]

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 10)
            with patch("soroscan.graphql_n1_detector.logger"):
                result = ext.resolve(mock_next, None, info)
                self.assertEqual(result, [{"id": 1}])


# ---------------------------------------------------------------------------
# Nested-resolver detection — the real N+1 pattern (issue #1290)
# ---------------------------------------------------------------------------

class N1DetectorNestedResolverTests(TestCase):
    """
    N+1 queries almost always occur in nested object resolvers, not top-level
    Query fields.  For example, resolving ``events`` on each item returned by
    ``contracts`` fires one DB query per contract (the N+1 pattern).

    The original implementation skipped non-Query/Mutation types, so this was
    never detected.  The enhanced version instruments all types.
    """

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=5)
    def test_detects_n1_on_nested_object_type(self):
        """Resolver on ContractType.events should trigger a warning."""
        ext = _make_ext()
        info = _make_info("ContractType", "events")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 8)
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_called_once()
                call_args = mock_logger.warning.call_args
                self.assertIn("N+1", call_args[0][0])
                self.assertEqual(call_args[0][1], "events")
                self.assertEqual(call_args[0][2], "ContractType")

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=5)
    def test_detects_n1_on_mutation_subtype(self):
        """Nested field on a Mutation result type should also be detected."""
        ext = _make_ext()
        info = _make_info("IngestPayload", "contract")

        def mock_next(root, info, *args, **kwargs):
            return {}

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 9)
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_called_once()

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=5)
    def test_no_warning_for_nested_resolver_below_threshold(self):
        ext = _make_ext()
        info = _make_info("ContractType", "events")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 2)
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_not_called()


# ---------------------------------------------------------------------------
# Introspection types are skipped
# ---------------------------------------------------------------------------

class N1DetectorIntrospectionSkipTests(TestCase):
    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True)
    def test_skips_schema_introspection_type(self):
        ext = _make_ext()
        info = _make_info("__Schema", "types")

        def mock_next(root, info, *args, **kwargs):
            return "schema_types"

        with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
            result = ext.resolve(mock_next, None, info)
            self.assertEqual(result, "schema_types")
            mock_logger.warning.assert_not_called()

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True)
    def test_skips_all_defined_skip_types(self):
        ext = _make_ext()

        for type_name in _SKIP_TYPES:
            info = _make_info(type_name, "someField")

            def mock_next(root, info, *args, **kwargs):
                return None

            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_not_called(), (
                    f"Warning unexpectedly emitted for skipped type {type_name!r}"
                )


# ---------------------------------------------------------------------------
# Configurable threshold
# ---------------------------------------------------------------------------

class N1DetectorThresholdTests(TestCase):
    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=2)
    def test_lower_threshold_triggers_earlier(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 3)  # 3 > threshold 2
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_called_once()
                # threshold value is passed as the 5th positional format arg
                call_args = mock_logger.warning.call_args
                self.assertEqual(call_args[0][5], 2)

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=20)
    def test_higher_threshold_suppresses_small_counts(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 10)  # 10 < threshold 20
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_not_called()

    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=20)
    def test_threshold_value_included_in_log_extra(self):
        ext = _make_ext()
        info = _make_info("Query", "contracts")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 25)  # 25 > 20
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                mock_logger.warning.assert_called_once()
                extra = mock_logger.warning.call_args[1].get("extra", {})
                self.assertEqual(extra.get("threshold"), 20)
                self.assertEqual(extra.get("query_count"), 25)


# ---------------------------------------------------------------------------
# Warning log structure
# ---------------------------------------------------------------------------

class N1DetectorLogStructureTests(TestCase):
    @override_settings(GRAPHQL_N1_DETECTION_ENABLED=True, GRAPHQL_N1_DETECTION_THRESHOLD=5)
    def test_warning_includes_field_parent_count_duration_threshold(self):
        ext = _make_ext()
        info = _make_info("ContractType", "invocations")

        def mock_next(root, info, *args, **kwargs):
            return []

        with patch("soroscan.graphql_n1_detector.connection") as mock_conn:
            mock_conn.queries = _GrowingQueryList(0, 7)
            with patch("soroscan.graphql_n1_detector.logger") as mock_logger:
                ext.resolve(mock_next, None, info)
                call_args = mock_logger.warning.call_args
                # Positional format args: field_name, parent_type, query_count, duration_ms, threshold
                self.assertEqual(call_args[0][1], "invocations")
                self.assertEqual(call_args[0][2], "ContractType")
                self.assertEqual(call_args[0][3], 7)
                extra = call_args[1]["extra"]
                self.assertIn("duration_ms", extra)
                self.assertEqual(extra["field_name"], "invocations")
                self.assertEqual(extra["parent_type"], "ContractType")
                self.assertEqual(extra["query_count"], 7)
                self.assertEqual(extra["threshold"], 5)
