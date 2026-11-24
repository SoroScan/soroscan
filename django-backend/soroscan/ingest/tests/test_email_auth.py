import pytest
from django.contrib.auth import get_user_model
from soroscan.authentication import EmailOrUsernameModelBackend

User = get_user_model()


@pytest.mark.django_db
def test_email_or_username_backend_authenticates_with_username():
    backend = EmailOrUsernameModelBackend()
    user = User.objects.create_user(username="testuser", email="test@example.com", password="password123")
    authenticated = backend.authenticate(None, username="testuser", password="password123")
    assert authenticated == user


@pytest.mark.django_db
def test_email_or_username_backend_authenticates_with_email():
    backend = EmailOrUsernameModelBackend()
    user = User.objects.create_user(username="testuser", email="test@example.com", password="password123")
    authenticated = backend.authenticate(None, username="test@example.com", password="password123")
    assert authenticated == user


@pytest.mark.django_db
def test_email_or_username_backend_fails_with_invalid_password():
    backend = EmailOrUsernameModelBackend()
    User.objects.create_user(username="testuser", email="test@example.com", password="password123")
    assert backend.authenticate(None, username="test@example.com", password="wrongpassword") is None
