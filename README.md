# AI PPT Generator

Generate beautiful HTML presentations using AI SDK 5.x and Gemini 3 Pro.

## Features

- 💬 Smart conversation guidance: Guide users to input PPT requirements through chat
- 📝 Auto-generate outline: AI generates structured PPT outline based on user input
- 🎨 Beautiful PPT generation: Generate modern HTML PPTs using Gemini 3 Pro
- 👁️ Fullscreen preview: Preview generated presentations in fullscreen
- 🎯 Responsive design: Adapts to different screen sizes
- 📱 Mobile-friendly: Fully responsive for mobile devices

## Tech Stack

- **Next.js 14** - React framework
- **AI SDK 5.x** - AI integration framework
- **OpenAI GPT-4o** - For generating PPT outline
- **Gemini 3 Pro** - Google's AI model for generating HTML PPT
- **@google/generative-ai** - Google Gemini API client
- **openai** - OpenAI API client
- **TypeScript** - Type safety
- **React** - UI framework
- **Tailwind CSS** - Styling

> **Note**:
> - Outline generation uses OpenAI GPT-4o model
> - PPT generation uses Gemini 3 Pro Preview model (`models/gemini-3-pro-preview`)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Copy `.env.example` to `.env.local` and fill in your API keys:
```bash
cp .env.example .env.local
```

Then edit `.env.local`:
```
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

Get API Keys:
- **Gemini API Key**:
  - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
  - Create a new API Key
  - Copy the Key to `.env.local` file
- **OpenAI API Key**:
  - Visit [OpenAI Platform](https://platform.openai.com/api-keys)
  - Create a new API Key
  - Copy the Key to `.env.local` file

3. Start development server:
```bash
npm run dev
```

4. Open browser and visit:
```
http://localhost:3000
```

## Deployment to Vercel

### Prerequisites
- A GitHub account
- A Vercel account (sign up at [vercel.com](https://vercel.com))

### Steps

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import project to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Click "Add New Project"
   - Import your GitHub repository
   - Vercel will automatically detect Next.js

3. **Configure Environment Variables** (详细步骤见 `VERCEL_ENV_SETUP.md`)
   - In the project settings, go to "Environment Variables"
   - Click "Add" or "Add Environment Variable"
   - Add first variable:
     - **Key**: `GOOGLE_GENERATIVE_AI_API_KEY`
     - **Value**: Your Gemini API key (from https://makersuite.google.com/app/apikey)
     - **Environment**: Select all (Production, Preview, Development)
     - Click "Save"
   - Add second variable:
     - **Key**: `OPENAI_API_KEY`
     - **Value**: Your OpenAI API key (from https://platform.openai.com/api-keys)
     - **Environment**: Select all (Production, Preview, Development)
     - Click "Save"
   - ⚠️ **Important**: After adding variables, you need to redeploy for them to take effect!

4. **Deploy**
   - Click "Deploy"
   - Vercel will build and deploy your application
   - Once deployed, you'll get a URL like `https://your-project.vercel.app`

### Important Security Notes

⚠️ **Never commit `.env.local` to Git!**

- ✅ `.env.local` is already in `.gitignore`
- ✅ Use `.env.example` as a template (without real keys)
- ✅ Set environment variables in Vercel Dashboard, not in code
- ✅ Environment variables in Vercel are encrypted and secure

### Vercel Environment Variables Setup

1. Go to your project on Vercel
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:
   - **Name**: `GOOGLE_GENERATIVE_AI_API_KEY`
   - **Value**: Your actual Gemini API key
   - **Environment**: Select all (Production, Preview, Development)
4. Repeat for `OPENAI_API_KEY`
5. Click **Save**
6. Redeploy your application for changes to take effect

## Usage

1. **Enter topic**: Type your PPT topic in the chat box, for example:
   - "I want to create a presentation about artificial intelligence"
   - "Generate a presentation introducing our company products"

2. **Review outline**: AI will first generate a PPT outline for your confirmation

3. **Generate PPT**: After confirmation, AI will generate the complete HTML PPT

4. **Preview PPT**: Click "Open Fullscreen Preview" button to view the generated presentation

## Project Structure

```
ppt_demo/
├── app/
│   ├── api/
│   │   ├── generate-outline/    # Outline generation API
│   │   ├── generate-ppt/         # PPT generation API
│   │   └── save-ppt/             # Save PPT API
│   ├── preview/
│   │   └── [id]/
│   │       └── page.tsx          # Preview page
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Main page
│   └── globals.css               # Global styles
├── components/
│   ├── ChatInterface.tsx         # Chat interface component
│   └── PPTPreview.tsx            # PPT preview component
├── public/
│   └── presentations/            # Generated PPTs (gitignored)
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vercel.json                   # Vercel configuration
└── README.md
```

## Notes

- Make sure to set `GOOGLE_GENERATIVE_AI_API_KEY` and `OPENAI_API_KEY` environment variables
- OpenAI API and Gemini API may have usage limits, check their respective quotas
- Generated PPTs use HTML/CSS and can be opened directly in browsers
- Currently using `models/gemini-3-pro-preview` model for PPT generation
- Generated presentations are saved in `public/presentations/` directory

## Development

```bash
# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT
