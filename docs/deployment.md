---
sidebar_position: 101
title: Deployment Guide
description: Deploy the Fingerprint Service documentation to various hosting platforms
---

# Deployment Guide

This guide covers deploying the Fingerprint Service documentation to various hosting platforms.

## Prerequisites

Before deploying, ensure you have:

- Node.js 18+ installed
- Documentation built successfully (`npm run build`)
- Access to your chosen hosting platform

## Build for Production

Always build the documentation before deploying:

```bash
cd docs-site
npm run build
```

This creates an optimized production build in the `build/` directory.

## Deployment Options

### Option 1: Vercel (Recommended)

Vercel offers automatic deployments with zero configuration.

#### Deploy via Vercel CLI

1. Install Vercel CLI:

```bash
npm install -g vercel
```

2. Deploy from the docs-site directory:

```bash
cd docs-site
vercel
```

3. Follow the prompts to link your project

4. For production deployment:

```bash
vercel --prod
```

#### Deploy via Git Integration

1. Push your code to GitHub, GitLab, or Bitbucket
2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your repository
5. Configure build settings:
   - **Framework Preset**: Docusaurus
   - **Root Directory**: `docs-site`
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
6. Click "Deploy"

#### Environment Variables

Set these in Vercel dashboard if needed:

- `SITE_URL`: Your production domain
- `BASE_URL`: Base path (usually `/`)

### Option 2: Netlify

Netlify provides continuous deployment from Git.

#### Deploy via Netlify CLI

1. Install Netlify CLI:

```bash
npm install -g netlify-cli
```

2. Deploy from the docs-site directory:

```bash
cd docs-site
netlify deploy
```

3. For production:

```bash
netlify deploy --prod
```

#### Deploy via Git Integration

1. Push your code to a Git repository
2. Go to [netlify.com](https://netlify.com)
3. Click "Add new site" → "Import an existing project"
4. Connect your Git provider
5. Configure build settings:
   - **Base directory**: `docs-site`
   - **Build command**: `npm run build`
   - **Publish directory**: `docs-site/build`
6. Click "Deploy site"

#### netlify.toml Configuration

Create `docs-site/netlify.toml`:

```toml
[build]
  base = "docs-site"
  command = "npm run build"
  publish = "build"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[build.environment]
  NODE_VERSION = "18"
```

### Option 3: GitHub Pages

Deploy directly from your GitHub repository.

#### Using GitHub Actions

1. Create `.github/workflows/deploy-docs.yml`:

```yaml
name: Deploy Documentation

on:
  push:
    branches:
      - main
    paths:
      - 'docs-site/**'

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: docs-site/package-lock.json
      
      - name: Install dependencies
        run: |
          cd docs-site
          npm ci
      
      - name: Build documentation
        run: |
          cd docs-site
          npm run build
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: docs-site/build

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

2. Update `docs-site/docusaurus.config.js`:

```javascript
const config = {
  // ...
  url: 'https://your-username.github.io',
  baseUrl: '/your-repo-name/',
  organizationName: 'your-username',
  projectName: 'your-repo-name',
  // ...
};
```

3. Enable GitHub Pages in repository settings:
   - Go to Settings → Pages
   - Source: GitHub Actions

#### Manual Deployment

```bash
cd docs-site
npm run build

# Install gh-pages
npm install -g gh-pages

# Deploy
gh-pages -d build
```

### Option 4: Self-Hosted with Nginx

Deploy to your own server using Nginx.

#### Server Setup

1. Build the documentation:

```bash
cd docs-site
npm run build
```

2. Copy build files to server:

```bash
scp -r build/* user@your-server:/var/www/fingerprint-docs/
```

#### Nginx Configuration

Create `/etc/nginx/sites-available/fingerprint-docs`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name docs.yourdomain.com;

    root /var/www/fingerprint-docs;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/fingerprint-docs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d docs.yourdomain.com
```

#### Automated Deployment Script

Create `deploy.sh`:

```bash
#!/bin/bash

# Build documentation
cd docs-site
npm run build

# Backup current deployment
ssh user@your-server "cp -r /var/www/fingerprint-docs /var/www/fingerprint-docs.backup"

# Deploy new build
rsync -avz --delete build/ user@your-server:/var/www/fingerprint-docs/

# Verify deployment
if ssh user@your-server "test -f /var/www/fingerprint-docs/index.html"; then
    echo "Deployment successful!"
    ssh user@your-server "rm -rf /var/www/fingerprint-docs.backup"
else
    echo "Deployment failed! Rolling back..."
    ssh user@your-server "rm -rf /var/www/fingerprint-docs && mv /var/www/fingerprint-docs.backup /var/www/fingerprint-docs"
    exit 1
fi
```

Make it executable:

```bash
chmod +x deploy.sh
```

### Option 5: Docker Deployment

Deploy using Docker containers.

#### Dockerfile

Create `docs-site/Dockerfile`:

```dockerfile
# Build stage
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build documentation
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files
COPY --from=builder /app/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf

Create `docs-site/nginx.conf`:

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/x-javascript application/xml+rss 
               application/javascript application/json;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Build and Run

```bash
# Build image
docker build -t fingerprint-docs docs-site/

# Run container
docker run -d -p 8080:80 --name fingerprint-docs fingerprint-docs

# Or use docker-compose
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  docs:
    build:
      context: ./docs-site
      dockerfile: Dockerfile
    ports:
      - "8080:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

## Post-Deployment Checklist

After deploying, verify:

- [ ] All pages load correctly
- [ ] Navigation works properly
- [ ] Search functionality works
- [ ] Images and assets load
- [ ] Links are not broken
- [ ] Mobile responsiveness
- [ ] SSL certificate is valid (if using HTTPS)
- [ ] robots.txt is accessible
- [ ] sitemap.xml is accessible
- [ ] Performance is acceptable (use Lighthouse)

## Continuous Deployment

### Automatic Deployments

Most platforms support automatic deployments:

- **Vercel/Netlify**: Automatically deploy on Git push
- **GitHub Pages**: Use GitHub Actions workflow
- **Self-hosted**: Set up Git hooks or CI/CD pipeline

### Deployment Workflow

1. Make changes to documentation
2. Test locally with `npm run start`
3. Build and verify with `npm run build && npm run serve`
4. Commit and push changes
5. Automatic deployment triggers
6. Verify deployment in production

## Troubleshooting

### Build Fails

- Check Node.js version (18+ required)
- Clear cache: `npm run clear`
- Delete node_modules and reinstall: `rm -rf node_modules && npm install`
- Check for broken links in documentation

### Deployment Fails

- Verify build directory exists and contains files
- Check deployment platform logs
- Ensure correct build command and output directory
- Verify environment variables are set

### 404 Errors

- Check baseUrl in docusaurus.config.js
- Verify server routing configuration
- Ensure all internal links use correct paths

### Assets Not Loading

- Check asset paths in documentation
- Verify static files are in the build output
- Check CDN or server configuration
- Clear browser cache

## Performance Optimization

### Build Optimization

- Enable compression in server configuration
- Use CDN for static assets
- Implement caching headers
- Minimize bundle size

### Monitoring

- Set up uptime monitoring
- Track page load times
- Monitor error rates
- Use analytics to track usage

## Security Considerations

- Always use HTTPS in production
- Set appropriate security headers
- Keep dependencies updated
- Implement rate limiting if needed
- Regular security audits

## Rollback Procedure

If deployment fails:

1. **Vercel/Netlify**: Use platform's rollback feature
2. **GitHub Pages**: Revert Git commit and redeploy
3. **Self-hosted**: Restore from backup
4. **Docker**: Roll back to previous image tag

## Support

For deployment issues:

- Check platform-specific documentation
- Review deployment logs
- Test build locally first
- Contact platform support if needed

## Next Steps

After successful deployment:

1. Set up custom domain (if applicable)
2. Configure analytics
3. Set up monitoring
4. Document deployment process for team
5. Schedule regular updates
