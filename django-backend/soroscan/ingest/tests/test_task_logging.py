"""
Tests for Celery task logging via signals.
"""
import time
from unittest.mock import patch, MagicMock

import pytest
from celery.signals import task_prerun, task_postrun


class TestTaskLogging:
    """Test task logging via Celery signals."""

    @pytest.fixture
    def mock_logger(self):
        with patch('soroscan.ingest.tasks.logger') as mock:
            yield mock

    def test_task_start_logged(self, mock_logger):
        """Verify task start is logged with args and kwargs."""
        task = MagicMock()
        task.name = "test.task"
        task.request.id = "test-task-id"
        
        # Trigger prerun signal
        task_prerun.send(
            sender=None,
            task_id="test-task-id",
            task=task,
            args=("arg1",),
            kwargs={"key": "value"},
        )
        
        mock_logger.info.assert_called_with(
            "Task started",
            extra={
                'task_name': 'test.task',
                'task_id': 'test-task-id',
                'args': ("arg1",),
                'kwargs': {"key": "value"},
            }
        )

    def test_task_completion_logged(self, mock_logger):
        """Verify task completion is logged with duration."""
        # First simulate task start to record time
        from soroscan.ingest import tasks
        tasks._task_start_times["test-task-id"] = time.time() - 1  # 1 second ago
        
        task = MagicMock()
        task.name = "test.task"
        
        # Trigger postrun signal
        task_postrun.send(
            sender=None,
            task_id="test-task-id",
            task=task,
            status="success",
            result=None,
            exception=None,
        )
        
        # Check info was called for completion
        call_args = mock_logger.info.call_args
        assert call_args is not None
        assert call_args[0][0] == "Task completed"
        assert call_args[1]['extra']['task_name'] == 'test.task'
        assert call_args[1]['extra']['duration_seconds'] >= 1.0

    def test_task_failure_logged(self, mock_logger):
        """Verify task failure is logged with error details."""
        from soroscan.ingest import tasks
        tasks._task_start_times["failed-task-id"] = time.time() - 0.5
        
        task = MagicMock()
        task.name = "failing.task"
        
        exception = ValueError("Something went wrong")
        
        task_postrun.send(
            sender=None,
            task_id="failed-task-id",
            task=task,
            status="failure",
            result=None,
            exception=exception,
        )
        
        call_args = mock_logger.error.call_args
        assert call_args is not None
        assert call_args[0][0] == "Task failed"
        assert call_args[1]['extra']['task_name'] == 'failing.task'
        assert 'ValueError' in call_args[1]['extra']['error_type']

    def test_sanitizes_sensitive_kwargs(self, mock_logger):
        """Verify sensitive data is redacted from logs."""
        task = MagicMock()
        task.name = "test.task"
        task.request.id = "sanitize-test-id"
        
        task_prerun.send(
            sender=None,
            task_id="sanitize-test-id",
            task=task,
            args=(),
            kwargs={
                "password": "secret123",
                "api_key": "sk-abc123",
                "normal_param": "visible",
            },
        )
        
        call_args = mock_logger.info.call_args
        extra = call_args[1]['extra']
        
        assert extra['kwargs']['password'] == '[REDACTED]'
        assert extra['kwargs']['api_key'] == '[REDACTED]'
        assert extra['kwargs']['normal_param'] == 'visible'

    def test_sanitizes_long_strings(self, mock_logger):
        """Verify long string values are truncated."""
        task = MagicMock()
        task.name = "test.task"
        task.request.id = "truncate-test-id"
        
        long_value = "x" * 300
        
        task_prerun.send(
            sender=None,
            task_id="truncate-test-id",
            task=task,
            args=(long_value,),
            kwargs={},
        )
        
        call_args = mock_logger.info.call_args
        extra = call_args[1]['extra']
        
        assert len(extra['args'][0]) < 300
        assert '[truncated]' in extra['args'][0]

    def test_handles_missing_task_id(self, mock_logger):
        """Verify graceful handling when task_id not in tracking dict."""
        # Don't add to _task_start_times - simulate edge case
        task = MagicMock()
        task.name = "test.task"
        
        task_postrun.send(
            sender=None,
            task_id="unknown-task-id",
            task=task,
            status="success",
            result=None,
            exception=None,
        )
        
        # Should not raise, completion log skipped for unknown task
        mock_logger.info.assert_not_called()