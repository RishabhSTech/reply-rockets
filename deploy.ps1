# Quick deployment script for Reply Rockets persona system
# Run this from the project root directory in PowerShell

Write-Host "🚀 Deploying Reply Rockets Persona System..." -ForegroundColor Green
Write-Host ""

# Check if supabase CLI is installed
try {
    supabase --version | Out-Null
} catch {
    Write-Host "❌ Supabase CLI not found. Installing..." -ForegroundColor Red
    npm install -g supabase
}

Write-Host "📦 Step 1: Linking to Supabase project..." -ForegroundColor Cyan
supabase link --project-ref kzxqeagnrlhyvijylkxp

Write-Host ""
Write-Host "🗄️  Step 2: Deploying database migrations..." -ForegroundColor Cyan
supabase db push

Write-Host ""
Write-Host "🔧 Step 3: Deploying Edge Functions..." -ForegroundColor Cyan
supabase functions deploy generate-persona
supabase functions deploy send-campaign-emails

Write-Host ""
Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start your dev server: npm run dev"
Write-Host "2. Test by adding a new lead with a LinkedIn URL"
Write-Host "3. Check that the persona appears in the Lead Detail Page"
Write-Host "4. Try the Campaign 'Run Now' feature to send emails"
Write-Host ""
Write-Host "For more details, see DEPLOYMENT_GUIDE.md" -ForegroundColor Blue
