# Docker Development Setup for ContextFlow

This setup provides a fully containerized development environment with hot reload support.

## Prerequisites

- Docker Desktop installed and running
- Chrome browser on your host machine

## Quick Start

### 1. Build and Start the Container

```bash
docker-compose up --build
```

This will:
- Build a Node.js 20 Alpine container
- Install all npm dependencies
- Start Vite in watch mode
- Mount your source code with hot reload

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `/dist` folder in your project directory

The extension is now loaded!

## Development Workflow

### File Watching & Hot Reload

Any changes you make to files in:
- `src/`
- `public/`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`

...will automatically trigger a rebuild. The `/dist` folder updates instantly.

### Reloading the Extension

After Vite rebuilds (watch the Docker logs), you need to reload the extension in Chrome:

**Option A: Manual Reload**
1. Go to `chrome://extensions/`
2. Click the refresh icon on your ContextFlow extension

**Option B: Use Extensions Reloader**
- Install "Extensions Reloader" from Chrome Web Store
- One-click refresh of all unpacked extensions

### Viewing Build Logs

```bash
# View live logs
docker-compose logs -f

# View just the last 50 lines
docker-compose logs --tail=50
```

### Stopping the Container

```bash
# Stop and remove container
docker-compose down

# Stop without removing
docker-compose stop
```

### Rebuilding from Scratch

```bash
# Rebuild container and dependencies
docker-compose up --build --force-recreate

# Remove everything including volumes
docker-compose down -v
docker-compose up --build
```

## Running Production Build

```bash
# Run production build inside container
docker-compose exec contextflow-dev npm run build

# Or run as one-off command
docker-compose run --rm contextflow-dev npm run build
```

## Troubleshooting

### Changes Not Reflecting

1. Check Docker logs: `docker-compose logs -f`
2. Ensure `CHOKIDAR_USEPOLLING=true` is set (already configured)
3. Verify `/dist` folder is updating on your host machine

### Port Conflicts

If port 5173 is already in use:
```yaml
# Edit docker-compose.yml, change:
ports:
  - "5174:5173"  # Use different host port
```

### Permission Issues

On Linux, you might need to adjust file permissions:
```bash
sudo chown -R $USER:$USER dist/
```

### Container Won't Start

```bash
# Remove all containers and volumes
docker-compose down -v

# Rebuild completely
docker-compose up --build --force-recreate
```

## Advantages of This Setup

✅ **Consistent Environment** - Same Node.js version across all developers
✅ **No Local Node.js Required** - Everything runs in Docker
✅ **Instant Hot Reload** - Vite watch mode with volume mounts
✅ **Isolated Dependencies** - No conflicts with other projects
✅ **Easy CI/CD** - Same Docker image for builds and testing

## Notes

- The extension still needs to be loaded into Chrome on your **host machine**
- Docker only handles the build environment, not the Chrome runtime
- Port 5173 is exposed but not strictly needed for extension development
- The `node_modules` volume prevents host/container conflicts
