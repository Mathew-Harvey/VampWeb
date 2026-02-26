# VampWeb

Frontend for the VAMP (Vessel Asset Management Platform). React + Vite + Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your API URL

# Start development server
npm run dev
```

The app runs on `http://localhost:5173` by default.

Make sure VampApi is running at the URL specified in `VITE_API_URL`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm test` | Run tests |
| `npm run lint` | TypeScript type check |

## Project Structure

```
src/
  api/           # API client and endpoint modules
  components/
    layout/      # MainLayout, Sidebar, Header
    ui/          # Reusable UI components (button, card, input, etc.)
    video/       # WebRTC video call components
    invite/      # Invitation dialog
  constants/     # Vessel types, work order statuses, fouling ratings
  hooks/         # Custom React hooks (useAuth, useVessels, etc.)
  lib/           # Utility functions
  pages/         # Page components (one per route)
  stores/        # Zustand state stores
  utils/         # Formatters and helpers
  App.tsx        # Router and route definitions
  main.tsx       # App entry point
  index.css      # Tailwind CSS and global styles
```

## Adding a New Feature

1. Create `src/pages/FeaturePage.tsx` - Page component
2. Add the route in `src/App.tsx`
3. Create `src/api/feature.ts` - API calls (if needed)
4. Create `src/hooks/useFeature.ts` - Data fetching hook (if needed)
5. Add navigation link in `src/components/layout/Sidebar.tsx`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | VampApi base URL | `http://localhost:3001/api/v1` |
