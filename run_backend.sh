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
echo "Available API routes:"
echo "  GET    /records"
echo "  GET    /records/:id"
echo "  POST   /records"
echo "  PUT    /records/:id"
echo "  DELETE /records/:id"
echo
echo "CORS is enabled directly on the Express side (no Vite proxy needed)."
echo
echo "Press Ctrl + C to stop the backend."
echo

cd server
npm run dev
