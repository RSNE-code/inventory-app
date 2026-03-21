#!/bin/bash
set -e
echo "Syncing Capacitor → Android..."
npx cap sync android
echo "Opening Android Studio..."
npx cap open android
echo "Build and run from Android Studio, or use: npx cap run android"
