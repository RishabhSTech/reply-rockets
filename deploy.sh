#!/bin/bash
# Quick deployment script for Reply Rockets persona system
# Run this from the project root directory

echo "🚀 Deploying Reply Rockets Persona System..."
echo ""

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Installing..."
    npm install -g supabase
fi

echo "📦 Step 1: Linking to Supabase project..."
supabase link --project-ref kzxqeagnrlhyvijylkxp

echo ""
echo "🗄️  Step 2: Deploying database migrations..."
supabase db push

echo ""
echo "🔧 Step 3: Deploying Edge Functions..."
supabase functions deploy generate-persona
supabase functions deploy send-campaign-emails

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Start your dev server: npm run dev"
echo "2. Test by adding a new lead with a LinkedIn URL"
echo "3. Check that the persona appears in the Lead Detail Page"
echo "4. Try the Campaign 'Run Now' feature to send emails"
echo ""
echo "For more details, see DEPLOYMENT_GUIDE.md"
