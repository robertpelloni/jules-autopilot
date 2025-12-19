# Vercel Deployment Guide

This project is a Next.js application that can be easily deployed to Vercel.

## Prerequisites

1.  A Vercel account (https://vercel.com)
2.  The Vercel CLI installed (optional, but recommended for local testing)
    ```bash
    npm i -g vercel
    ```

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1.  Push your code to a Git repository (GitHub, GitLab, or Bitbucket).
2.  Log in to Vercel and click "Add New..." -> "Project".
3.  Import your Git repository.
4.  Vercel will automatically detect that it's a Next.js project.
5.  **Environment Variables**: You need to configure the environment variables.
    *   `NEXT_PUBLIC_JULES_API_KEY`: (Optional) If you want to bake in a default key, though users can set their own in the UI.
    *   `OPENAI_API_KEY`: If you are using the server-side supervisor features.
    *   Any other keys required by your specific setup.
6.  Click "Deploy".

### Option 2: Deploy via CLI

1.  Run `vercel` in the project root.
2.  Follow the prompts to link the project to your Vercel account.
3.  Set up environment variables when prompted or via `vercel env add`.
4.  Run `vercel --prod` to deploy to production.

## Continuous Deployment

Once connected to a Git repository, Vercel will automatically deploy every push to the `main` branch to production, and every push to other branches to a preview URL.

## Important Notes

*   **API Routes**: The application uses Next.js API routes (`app/api/...`). These will be deployed as Serverless Functions on Vercel.
*   **Timeouts**: Vercel Serverless Functions have a default timeout (usually 10s or 60s depending on the plan). If your supervisor agents take longer than this, you might need to upgrade your plan or use a different architecture (e.g., background jobs).
*   **Edge Runtime**: If you switch any routes to use the Edge Runtime, ensure all dependencies are compatible.

## Troubleshooting

*   **Build Errors**: Check the "Build Logs" in the Vercel dashboard. Common issues include type errors (`npm run build` runs type checking by default) or missing dependencies.
*   **Runtime Errors**: Check the "Runtime Logs" / "Functions" tab in Vercel.

