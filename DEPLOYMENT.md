# Deployment Guide

## Deploying to Vercel

This guide will help you deploy the AI PPT Generator to Vercel safely without exposing your API keys.

### Step 1: Prepare Your Repository

1. Make sure all your code is committed:
   ```bash
   git status
   git add .
   git commit -m "Ready for deployment"
   ```

2. Verify `.env.local` is NOT tracked:
   ```bash
   git ls-files | grep .env
   ```
   This should return nothing. If it shows `.env.local`, remove it:
   ```bash
   git rm --cached .env.local
   git commit -m "Remove .env.local from tracking"
   ```

### Step 2: Push to GitHub

1. Create a new repository on GitHub (if you haven't already)
2. Push your code:
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```

### Step 3: Deploy to Vercel

1. **Sign in to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Project**
   - Click "Add New Project"
   - Select your repository
   - Vercel will auto-detect Next.js settings

3. **Configure Environment Variables** (IMPORTANT!)
   - Before deploying, click "Environment Variables" or "Configure Project"
   - Click "Add" or "Add Environment Variable" button
   - Add the first variable:
     - **Key**: `GOOGLE_GENERATIVE_AI_API_KEY`
     - **Value**: Your actual Gemini API key (get from https://makersuite.google.com/app/apikey)
     - **Environment**: Select all (Production, Preview, Development)
     - Click "Save"
   - Add the second variable:
     - **Key**: `OPENAI_API_KEY`
     - **Value**: Your actual OpenAI API key (get from https://platform.openai.com/api-keys)
     - **Environment**: Select all (Production, Preview, Development)
     - Click "Save"
   - ⚠️ Make sure both variables are added before deploying!

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Step 4: Verify Deployment

1. Visit your deployed URL
2. Test the application
3. Check that API calls work (they should use the environment variables from Vercel)

## Security Checklist

- ✅ `.env.local` is in `.gitignore`
- ✅ `.env.example` contains only placeholders (no real keys)
- ✅ Environment variables are set in Vercel Dashboard, not in code
- ✅ No API keys are hardcoded in the source code
- ✅ All environment variables use `process.env` in code

## Troubleshooting

### Build Fails
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility
- Check build logs in Vercel dashboard

### API Keys Not Working
- Verify environment variables are set correctly in Vercel
- Make sure variables are added to all environments
- Redeploy after adding environment variables
- Check API key permissions and quotas

### Preview Not Working
- Ensure `public/presentations/` directory exists
- Check file permissions
- Verify the save-ppt API is working

## Environment Variables Reference

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key for PPT generation | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `OPENAI_API_KEY` | OpenAI API key for outline generation | [OpenAI Platform](https://platform.openai.com/api-keys) |

## Updating Environment Variables

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit or add variables
3. Click "Save"
4. Redeploy your application (or wait for automatic redeploy on next push)

## Continuous Deployment

Vercel automatically deploys when you push to your main branch:
- Push to `main` → Production deployment
- Push to other branches → Preview deployment
- Pull requests → Preview deployment with PR comments

