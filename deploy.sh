#!/bin/bash

# Deployment script for ThankYouDoc
echo "Building ThankYouDoc for production..."

# Install dependencies
npm install

# Build the project
npm run build

echo "Build completed successfully!"
echo "Deploy the contents of the 'dist' folder to your hosting platform."
echo ""
echo "For SPA routing, make sure your hosting platform is configured to serve index.html for all routes."
echo "See DEPLOYMENT.md for platform-specific configurations."
