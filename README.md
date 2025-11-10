# Fingerprint Service Documentation

This directory contains the Docusaurus-based documentation site for the Fingerprint Background Service.

## Development

### Prerequisites

- Node.js 18.0 or higher
- npm or yarn

### Installation

```bash
npm install
```

### Local Development

```bash
npm start
```

This command starts a local development server and opens up a browser window. Most changes are reflected live without having to restart the server.

### Build

```bash
npm run build
```

This command generates static content into the `build` directory and can be served using any static contents hosting service.

### Serve Production Build Locally

```bash
npm run serve
```

This command serves the production build locally for testing before deployment.

## Project Structure

```
docs-site/
├── docs/                    # Documentation markdown files
├── src/
│   ├── components/         # Custom React components
│   ├── css/               # Custom CSS
│   └── pages/             # Custom pages
├── static/                # Static assets (images, etc.)
├── docusaurus.config.js   # Docusaurus configuration
├── sidebars.js           # Sidebar navigation structure
└── package.json          # Dependencies and scripts
```

## Deployment

The documentation can be deployed to various hosting platforms. See the [Deployment Guide](./docs/deployment.md) for detailed instructions.

### Quick Deployment

#### Vercel (Recommended)

```bash
npm install -g vercel
cd docs-site
vercel
```

#### Netlify

```bash
npm install -g netlify-cli
cd docs-site
netlify deploy
```

#### GitHub Pages

1. Update `docusaurus.config.js` with your repository details
2. Set up GitHub Actions workflow (see deployment guide)
3. Push to main branch

#### Self-Hosted

```bash
npm run build
# Copy build/ directory to your web server
```

For complete deployment instructions including Docker, Nginx configuration, and CI/CD setup, see the [full Deployment Guide](./docs/deployment.md).

## Contributing

When adding new documentation:

1. Create markdown files in the appropriate `docs/` subdirectory
2. Update `sidebars.js` if adding new sections
3. Follow the existing documentation structure and style
4. Test locally with `npm start` before committing
5. Ensure all links work and code examples are correct

## Documentation Guidelines

- Use clear, concise language
- Provide working code examples
- Include error handling in examples
- Add troubleshooting sections where appropriate
- Use Mermaid diagrams for complex workflows
- Test all code examples before publishing
