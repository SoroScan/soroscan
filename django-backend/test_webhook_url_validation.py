#!/usr/bin/env python
"""
Quick validation test for webhook URL security.
This script tests the URL validation logic without requiring the full test suite.
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'soroscan.settings')
sys.path.insert(0, os.path.dirname(__file__))
django.setup()

from django.conf import settings
from rest_framework import serializers
from urllib.parse import urlparse


def validate_target_url(value, debug_mode):
    """Replicate the validation logic from WebhookSubscriptionSerializer"""
    if not value:
        raise serializers.ValidationError("Target URL is required.")

    parsed = urlparse(value)
    
    # In production (DEBUG=False), only allow HTTPS
    if not debug_mode and parsed.scheme != 'https':
        raise serializers.ValidationError(
            "Only HTTPS URLs are allowed in production mode. "
            "Please use an HTTPS endpoint to ensure secure webhook delivery."
        )
    
    # Ensure the scheme is either http or https
    if parsed.scheme not in ('http', 'https'):
        raise serializers.ValidationError(
            f"Invalid URL scheme '{parsed.scheme}'. Only HTTP and HTTPS are supported."
        )
    
    return value


def test_validation():
    """Run validation tests"""
    print("Testing Webhook URL Validation\n" + "="*50)
    
    test_cases = [
        # (url, debug_mode, should_pass, description)
        ("https://example.com/webhook", False, True, "HTTPS in production"),
        ("http://example.com/webhook", False, False, "HTTP in production (should fail)"),
        ("http://localhost:8000/webhook", True, True, "HTTP in debug mode"),
        ("https://example.com/webhook", True, True, "HTTPS in debug mode"),
        ("ftp://example.com/webhook", True, False, "Invalid scheme (should fail)"),
        ("ftp://example.com/webhook", False, False, "Invalid scheme in production (should fail)"),
    ]
    
    passed = 0
    failed = 0
    
    for url, debug_mode, should_pass, description in test_cases:
        mode_str = "DEBUG=True" if debug_mode else "DEBUG=False"
        try:
            validate_target_url(url, debug_mode)
            if should_pass:
                print(f"✓ PASS: {description} ({mode_str})")
                passed += 1
            else:
                print(f"✗ FAIL: {description} ({mode_str}) - Expected validation error but passed")
                failed += 1
        except serializers.ValidationError as e:
            if not should_pass:
                print(f"✓ PASS: {description} ({mode_str}) - Correctly rejected: {e}")
                passed += 1
            else:
                print(f"✗ FAIL: {description} ({mode_str}) - Unexpected error: {e}")
                failed += 1
    
    print("\n" + "="*50)
    print(f"Results: {passed} passed, {failed} failed")
    
    return failed == 0


if __name__ == "__main__":
    success = test_validation()
    sys.exit(0 if success else 1)
