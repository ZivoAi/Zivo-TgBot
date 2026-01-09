#!/bin/bash

# Local development setup script

set -e

echo "🚀 ZivoPal Classroom Bot - Local Setup"
echo "======================================"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "❌ Node.js not found. Please install Node.js >= 18.0.0"
  exit 1
fi

NODE_VERSION=$(node -v)
echo "✅ Node.js $NODE_VERSION found"

# Check npm
if ! command -v npm &> /dev/null; then
  echo "❌ npm not found."
  exit 1
fi

NPM_VERSION=$(npm -v)
echo "✅ npm $NPM_VERSION found"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# Create .env if not exists
if [ ! -f .env ]; then
  echo "📋 Creating .env file..."
  cp .env.example .env
  echo "⚠️  Please update .env with your credentials:"
  echo "   - TELEGRAM_BOT_TOKEN"
  echo "   - TELEGRAM_WEBHOOK_SECRET"
  echo "   - ZIVOPAL_CLIENT_ID"
  echo "   - ZIVOPAL_CLIENT_SECRET"
else
  echo "✅ .env file already exists"
fi
echo ""

# Run type check
echo "🔍 Running type check..."
npm run type-check
echo "✅ Type check passed"
echo ""

# Run linting
echo "🔍 Running linter..."
npm run lint
echo "✅ Linting passed"
echo ""

# Run tests
echo "🧪 Running tests..."
npm test -- --passWithNoTests
echo "✅ Tests passed"
echo ""

echo "✨ Setup complete!"
echo ""
echo "📖 Next steps:"
echo "  1. Update .env with your configuration"
echo "  2. Run: npm run dev"
echo "  3. Test: curl http://localhost:3000/health"
echo ""
echo "📚 Documentation:"
echo "  - README.md - Overview and features"
echo "  - TELEGRAM_SETUP.md - Telegram bot configuration"
echo "  - CONTRIBUTING.md - Development guidelines"
echo "  - API_REQUIREMENTS.md - zivopal-core API specs"
