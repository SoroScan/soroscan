#!/usr/bin/env python
"""
Simple verification script for reset_admin_password command.
Run this to verify the command works without full test environment.
"""
import os
import sys

# Setup Django before importing Django modules
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'soroscan.settings_test')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import django  # noqa: E402

django.setup()

from django.contrib.auth import get_user_model  # noqa: E402
from django.core.management import call_command  # noqa: E402
from io import StringIO  # noqa: E402

User = get_user_model()

def test_command():
    print("Testing reset_admin_password command...")
    
    # Clean up any existing admin user
    User.objects.filter(username='admin').delete()
    
    # Create admin user
    print("\n1. Creating admin user with password 'oldpass'...")
    user = User.objects.create_user(username='admin', password='oldpass')
    print(f"   ✓ User created: {user.username}")
    
    # Test password reset
    print("\n2. Resetting password to 'newpass123'...")
    out = StringIO()
    call_command('reset_admin_password', '--password=newpass123', stdout=out)
    print(f"   ✓ Command output: {out.getvalue().strip()}")
    
    # Verify password changed
    print("\n3. Verifying password was changed...")
    user.refresh_from_db()
    assert user.check_password('newpass123'), "New password doesn't work!"
    assert not user.check_password('oldpass'), "Old password still works!"
    print("   ✓ Password successfully changed")
    
    # Test with non-existent user
    print("\n4. Testing with non-existent user...")
    out = StringIO()
    try:
        call_command('reset_admin_password', '--username=nonexistent', '--password=test', stdout=out)
        print("   ✗ Should have raised an error!")
        sys.exit(1)
    except Exception as e:
        print(f"   ✓ Correctly raised error: {type(e).__name__}")
    
    # Clean up
    user.delete()
    
    print("\n" + "="*50)
    print("✓ All tests passed!")
    print("="*50)

if __name__ == '__main__':
    test_command()
