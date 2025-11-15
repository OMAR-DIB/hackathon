# Docker Setup

This project includes Docker configuration for easy deployment.

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Build and run the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The application will be available at http://localhost:3000

### Using Docker CLI

```bash
# Build the image
docker build -t hackathon-dashboard .

# Run the container
docker run -d -p 3000:80 --name hackathon-dashboard hackathon-dashboard

# View logs
docker logs -f hackathon-dashboard

# Stop the container
docker stop hackathon-dashboard

# Remove the container
docker rm hackathon-dashboard
```

## Configuration

- **Port**: The application runs on port 80 inside the container and is mapped to port 3000 on your host machine. You can change this in `docker-compose.yml` or the `-p` flag.
- **Nginx Configuration**: Custom nginx configuration is in `nginx.conf` with optimizations for SPAs, caching, and compression.

## Production Deployment

For production, consider:

1. **Environment Variables**: Add environment-specific configuration
2. **SSL/TLS**: Use a reverse proxy like Traefik or configure SSL in nginx
3. **Health Checks**: Add health check endpoints
4. **Resource Limits**: Set memory and CPU limits in docker-compose.yml

Example with resource limits:

```yaml
services:
  hackathon-dashboard:
    build: .
    ports:
      - "3000:80"
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Troubleshooting

### Port already in use
If port 3000 is already in use, change it in `docker-compose.yml`:
```yaml
ports:
  - "8080:80"  # Use port 8080 instead
```

### Rebuild after changes
```bash
docker-compose up -d --build
```
