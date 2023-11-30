#!/bin/bash
set -e
pushd A5
echo "Type-checking the front end"
tsc --strict main.ts

echo "Type-checking the back end"
mypy mainto.py --strict --ignore-missing-imports
echo "Running"
python3 mainto.py
popd

echo "Done"
