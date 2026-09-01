#!/usr/bin/env bash
set -euo pipefail

echo "============================================================"
echo " Starting the Express backend"
echo "============================================================"
echo
echo "This terminal runs the backend API server."
echo "Keep this terminal open while testing the app."
echo
echo "The backend listens on:"
echo "  http://localhost:3001"
echo
echo "Press Ctrl + C to stop the backend."
echo

cd backend
npm run dev
