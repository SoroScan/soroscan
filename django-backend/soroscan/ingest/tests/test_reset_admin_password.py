"""
Tests for reset_admin_password management command.
"""
import io
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError

User = get_user_model()


@pytest.mark.django_db
class TestResetAdminPasswordCommand:
    """Test reset_admin_password management command."""

    def test_reset_password_with_password_argument(self):
        """Test resetting password using --password argument."""
        # Create admin user
        user = User.objects.create_user(username="admin", password="oldpass")
        
        # Reset password
        out = io.StringIO()
        call_command("reset_admin_password", "--password=newpass123", stdout=out)
        
        # Verify password was changed
        user.refresh_from_db()
        assert user.check_password("newpass123")
        assert not user.check_password("oldpass")
        assert "successfully updated" in out.getvalue().lower()

    def test_reset_password_for_custom_username(self):
        """Test resetting password for non-admin user."""
        # Create custom user
        user = User.objects.create_user(username="testuser", password="oldpass")
        
        # Reset password
        out = io.StringIO()
        call_command(
            "reset_admin_password",
            "--username=testuser",
            "--password=newpass456",
            stdout=out,
        )
        
        # Verify password was changed
        user.refresh_from_db()
        assert user.check_password("newpass456")
        assert "testuser" in out.getvalue()

    def test_user_does_not_exist(self):
        """Test error handling when user doesn't exist."""
        out = io.StringIO()
        err = io.StringIO()
        
        with pytest.raises(CommandError) as exc_info:
            call_command(
                "reset_admin_password",
                "--username=nonexistent",
                "--password=newpass",
                stdout=out,
                stderr=err,
            )
        
        assert "not found" in str(exc_info.value).lower()
        assert "nonexistent" in out.getvalue()

    def test_user_does_not_exist_shows_available_users(self):
        """Test that error message shows available users."""
        # Create some users
        User.objects.create_user(username="user1", password="pass1")
        User.objects.create_user(username="user2", password="pass2")
        
        out = io.StringIO()
        
        with pytest.raises(CommandError):
            call_command(
                "reset_admin_password",
                "--username=nonexistent",
                "--password=newpass",
                stdout=out,
            )
        
        output = out.getvalue()
        assert "user1" in output
        assert "user2" in output

    @patch("sys.stdin.isatty", return_value=True)
    @patch("getpass.getpass")
    def test_interactive_password_prompt(self, mock_getpass, mock_isatty):
        """Test interactive password prompt."""
        # Create admin user
        user = User.objects.create_user(username="admin", password="oldpass")
        
        # Mock password input
        mock_getpass.side_effect = ["newpass789", "newpass789"]
        
        out = io.StringIO()
        call_command("reset_admin_password", stdout=out)
        
        # Verify password was changed
        user.refresh_from_db()
        assert user.check_password("newpass789")
        assert mock_getpass.call_count == 2

    @patch("sys.stdin.isatty", return_value=True)
    @patch("getpass.getpass")
    def test_interactive_password_mismatch(self, mock_getpass, mock_isatty):
        """Test error when passwords don't match."""
        # Create admin user
        User.objects.create_user(username="admin", password="oldpass")
        
        # Mock mismatched passwords
        mock_getpass.side_effect = ["password1", "password2"]
        
        with pytest.raises(CommandError) as exc_info:
            call_command("reset_admin_password")
        
        assert "do not match" in str(exc_info.value).lower()

    @patch("sys.stdin.isatty", return_value=True)
    @patch("getpass.getpass")
    def test_interactive_empty_password(self, mock_getpass, mock_isatty):
        """Test error when empty password is provided."""
        # Create admin user
        User.objects.create_user(username="admin", password="oldpass")
        
        # Mock empty password
        mock_getpass.side_effect = ["", ""]
        
        with pytest.raises(CommandError) as exc_info:
            call_command("reset_admin_password")
        
        assert "cannot be empty" in str(exc_info.value).lower()

    @patch("sys.stdin.isatty", return_value=False)
    def test_non_interactive_without_password_fails(self, mock_isatty):
        """Test that non-interactive mode requires --password."""
        # Create admin user
        User.objects.create_user(username="admin", password="oldpass")
        
        with pytest.raises(CommandError) as exc_info:
            call_command("reset_admin_password")
        
        assert "non-interactively" in str(exc_info.value).lower()

    def test_password_actually_works_for_login(self):
        """Test that the new password actually works for authentication."""
        from django.contrib.auth import authenticate
        
        # Create admin user
        User.objects.create_user(username="admin", password="oldpass")
        
        # Reset password
        call_command("reset_admin_password", "--password=newpass123")
        
        # Verify old password doesn't work
        user = authenticate(username="admin", password="oldpass")
        assert user is None
        
        # Verify new password works
        user = authenticate(username="admin", password="newpass123")
        assert user is not None
        assert user.username == "admin"

    def test_multiple_password_resets(self):
        """Test resetting password multiple times."""
        # Create admin user
        user = User.objects.create_user(username="admin", password="pass1")
        
        # First reset
        call_command("reset_admin_password", "--password=pass2")
        user.refresh_from_db()
        assert user.check_password("pass2")
        
        # Second reset
        call_command("reset_admin_password", "--password=pass3")
        user.refresh_from_db()
        assert user.check_password("pass3")
        assert not user.check_password("pass2")
        assert not user.check_password("pass1")

    def test_preserves_other_user_fields(self):
        """Test that resetting password doesn't affect other user fields."""
        # Create admin user with additional fields
        user = User.objects.create_user(
            username="admin",
            password="oldpass",
            email="admin@example.com",
            first_name="Admin",
            last_name="User",
            is_staff=True,
            is_superuser=True,
        )
        
        # Reset password
        call_command("reset_admin_password", "--password=newpass")
        
        # Verify other fields are preserved
        user.refresh_from_db()
        assert user.email == "admin@example.com"
        assert user.first_name == "Admin"
        assert user.last_name == "User"
        assert user.is_staff is True
        assert user.is_superuser is True
        assert user.check_password("newpass")
