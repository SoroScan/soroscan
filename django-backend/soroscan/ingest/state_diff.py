"""
State difference calculation utilities for contract snapshots.

This module provides functions to compute differences between two contract state
dictionaries, detecting additions, deletions, and modifications at all nesting levels.
"""
from typing import Any


def compute_state_diff(
    current_state: dict,
    previous_state: dict,
    path_prefix: str = "",
) -> list[dict]:
    """
    Recursively compute differences between two state dictionaries.
    
    Detects:
    - Field additions: key exists in current but not in previous (old_value=null)
    - Field deletions: key exists in previous but not in current (new_value=null)
    - Field modifications: key exists in both with different values
    - Nested changes: recursively traverses objects with dot-notation paths
    
    Args:
        current_state: New state dictionary
        previous_state: Old state dictionary
        path_prefix: Dot-notation prefix for nested fields (e.g., "config.settings")
        
    Returns:
        List of change dictionaries with:
            - field_name: str (dot-notation path, e.g., "config.fee_rate")
            - old_value: Any (null for additions)
            - new_value: Any (null for deletions)
            
    Examples:
        >>> previous = {"balance": 100, "config": {"fee": 0.01}}
        >>> current = {"balance": 200, "config": {"fee": 0.02, "enabled": True}}
        >>> changes = compute_state_diff(current, previous)
        >>> # Returns:
        >>> # [
        >>> #   {"field_name": "balance", "old_value": 100, "new_value": 200},
        >>> #   {"field_name": "config.fee", "old_value": 0.01, "new_value": 0.02},
        >>> #   {"field_name": "config.enabled", "old_value": None, "new_value": True}
        >>> # ]
    """
    changes = []
    
    # Get all unique keys from both states
    all_keys = set(current_state.keys()) | set(previous_state.keys())
    
    for key in all_keys:
        # Build field path with dot notation
        field_path = f"{path_prefix}.{key}" if path_prefix else key
        
        current_value = current_state.get(key)
        previous_value = previous_state.get(key)
        
        # Field added (exists in current but not in previous)
        if key not in previous_state:
            changes.append({
                "field_name": field_path,
                "old_value": None,
                "new_value": current_value,
            })
        
        # Field deleted (exists in previous but not in current)
        elif key not in current_state:
            changes.append({
                "field_name": field_path,
                "old_value": previous_value,
                "new_value": None,
            })
        
        # Field exists in both - check if modified
        elif current_value != previous_value:
            # If both values are dicts, recurse to find nested changes
            if isinstance(current_value, dict) and isinstance(previous_value, dict):
                nested_changes = compute_state_diff(
                    current_value,
                    previous_value,
                    path_prefix=field_path,
                )
                changes.extend(nested_changes)
            else:
                # Treat arrays and primitives as atomic values
                # (compare entire value, don't recurse into array elements)
                changes.append({
                    "field_name": field_path,
                    "old_value": previous_value,
                    "new_value": current_value,
                })
    
    return changes
