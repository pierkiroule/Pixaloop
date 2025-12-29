# Pixaloop

Base React webapp powered by Vite and configured for easy deployment on Vercel.

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the dev server:

   ```bash
   npm run dev
   ```

3. Build for production:

   ```bash
   npm run build
   ```

4. Preview the production build locally:

   ```bash
   npm run preview
   ```

## Deploying to Vercel

The repository includes a `vercel.json` with sensible defaults:

- `installCommand`: `npm install`
- `buildCommand`: `npm run build`
- `outputDirectory`: `dist`
- `devCommand`: `npm run dev`

Push to a Git provider connected to Vercel, import the project, and Vercel will handle the build and deploy steps automatically.
