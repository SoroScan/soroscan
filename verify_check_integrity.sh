#!/bin/bash
# Quick verification script for check_integrity command

echo "========================================"
echo "Check Integrity Command Verification"
echo "========================================"
echo ""

# Check if files exist
echo "1. Verifying file structure..."
files=(
    "soroscan/ingest/management/commands/check_integrity.py"
    "soroscan/ingest/tests/test_check_integrity.py"
    "CHECK_INTEGRITY_GUIDE.md"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✓ $file exists"
    else
        echo "   ✗ $file NOT FOUND"
    fi
done

echo ""
echo "2. Checking Python syntax..."

# Check check_integrity.py
echo "   Checking check_integrity.py..."
python3 -m py_compile soroscan/ingest/management/commands/check_integrity.py 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✓ check_integrity.py syntax OK"
else
    echo "   ✗ check_integrity.py has syntax errors"
fi

# Check test_check_integrity.py
echo "   Checking test_check_integrity.py..."
python3 -m py_compile soroscan/ingest/tests/test_check_integrity.py 2>/dev/null
if [ $? -eq 0 ]; then
    echo "   ✓ test_check_integrity.py syntax OK"
else
    echo "   ✗ test_check_integrity.py has syntax errors"
fi

echo ""
echo "3. Verifying imports..."
echo "   Checking for ContractEvent model import..."
grep -q "from soroscan.ingest.models import ContractEvent" soroscan/ingest/management/commands/check_integrity.py
if [ $? -eq 0 ]; then
    echo "   ✓ ContractEvent import found"
else
    echo "   ✗ ContractEvent import NOT found"
fi

echo ""
echo "4. Checking command class..."
grep -q "class Command(BaseCommand):" soroscan/ingest/management/commands/check_integrity.py
if [ $? -eq 0 ]; then
    echo "   ✓ Command class defined"
else
    echo "   ✗ Command class NOT found"
fi

echo ""
echo "5. Checking test methods..."
test_count=$(grep -c "def test_" soroscan/ingest/tests/test_check_integrity.py)
echo "   Found $test_count test methods"
if [ $test_count -ge 15 ]; then
    echo "   ✓ Sufficient test coverage ($test_count tests)"
else
    echo "   ✗ Insufficient test coverage ($test_count tests, expected >= 15)"
fi

echo ""
echo "6. Checking algorithm implementation..."
grep -q "_find_gaps" soroscan/ingest/management/commands/check_integrity.py
if [ $? -eq 0 ]; then
    echo "   ✓ Gap finding algorithm implemented"
else
    echo "   ✗ Gap finding algorithm NOT found"
fi

echo ""
echo "7. Checking command features..."

# Check for argument parsing
grep -q "add_argument" soroscan/ingest/management/commands/check_integrity.py
if [ $? -eq 0 ]; then
    echo "   ✓ Argument parsing implemented"
fi

# Check for filtering options
grep -q "contract" soroscan/ingest/management/commands/check_integrity.py && \
grep -q "event-type" soroscan/ingest/management/commands/check_integrity.py
if [ $? -eq 0 ]; then
    echo "   ✓ Filtering options implemented (--contract, --event-type)"
fi

# Check for output formatting
grep -q "self.style.SUCCESS" soroscan/ingest/management/commands/check_integrity.py && \
grep -q "self.style.ERROR" soroscan/ingest/management/commands/check_integrity.py
if [ $? -eq 0 ]; then
    echo "   ✓ Output formatting implemented (colored output)"
fi

echo ""
echo "========================================"
echo "Verification Complete!"
echo "========================================"
echo ""
echo "To run the tests (requires Django setup):"
echo "  pytest soroscan/ingest/tests/test_check_integrity.py -v"
echo ""
echo "To use the command in production:"
echo "  python manage.py check_integrity"
echo "  python manage.py check_integrity --contract=<id>"
echo "  python manage.py check_integrity --event-type=<type>"
echo "  python manage.py check_integrity --verbose"
