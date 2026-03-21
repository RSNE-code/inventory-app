#!/bin/bash
set -e
echo "Syncing Capacitor → iOS..."
npx cap sync ios
echo "Opening Xcode..."
npx cap open ios
echo "Build and run from Xcode, or use: npx cap run ios"
