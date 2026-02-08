# Contracts Integration Guide

This document explains how to integrate the `5g-health-platform-contracts` repository into the ingestion service.

## Strategy: Git Submodule (Recommended)

Using git submodules allows version pinning and easy updates.

### Initial Setup

```bash
# Add contracts as submodule
git submodule add https://github.com/YOUR_ORG/5g-health-platform-contracts.git contracts

# Initialize and checkout
git submodule update --init --recursive

# Pin to specific version
cd contracts
git checkout v1.0.0
cd ..

# Commit the submodule reference
git add .gitmodules contracts
git commit -m "Add contracts submodule pinned to v1.0.0"
```

### Cloning This Repo With Submodules

```bash
# Option 1: Clone with submodules
git clone --recurse-submodules <repo-url>

# Option 2: Initialize after cloning
git clone <repo-url>
cd 5g-health-platform-ingestion
git submodule update --init --recursive
```

### Updating Contracts Version

```bash
cd contracts
git fetch --tags
git checkout v1.1.0  # or desired version
cd ..
git add contracts
git commit -m "Update contracts to v1.1.0"
git push
```

### Checking Current Version

```bash
cd contracts
git describe --tags
# or
git log -1 --oneline
```

## Alternative: Vendored Approach

If you prefer not to use submodules, you can vendor the schemas.

### Setup

```bash
# Clone contracts to temporary location
git clone https://github.com/YOUR_ORG/5g-health-platform-contracts.git /tmp/contracts
cd /tmp/contracts
git checkout v1.0.0

# Copy schemas to your project
mkdir -p contracts/schemas
cp -r schemas/* contracts/schemas/

# Document the version
echo "v1.0.0" > contracts/VERSION
```

### Updating

```bash
# Pull latest contracts
cd /tmp/contracts
git fetch --tags
git checkout v1.1.0

# Replace schemas
rm -rf contracts/schemas
cp -r /tmp/contracts/schemas contracts/schemas/
echo "v1.1.0" > contracts/VERSION

# Commit
git add contracts/
git commit -m "Update vendored contracts to v1.1.0"
```

## Schema Locations

After integration, schemas should be accessible at:

```
contracts/schemas/
├── domain/
│   └── vitals.json
├── events/
│   └── vitals-recorded.json
└── api/
    └── ... (not used by this service)
```

## Environment Configuration

Set `CONTRACTS_PATH` in `.env`:

```env
# For submodule or vendored
CONTRACTS_PATH=./contracts/schemas

# For custom location
CONTRACTS_PATH=/path/to/contracts/schemas
```

## Validation

Verify schemas are accessible:

```bash
# Check domain schema exists
ls contracts/schemas/domain/vitals.json

# Check event schema exists
ls contracts/schemas/events/vitals-recorded.json

# Validate JSON syntax
cat contracts/schemas/domain/vitals.json | jq .
```

## CI/CD Integration

The GitHub Actions workflow automatically handles submodules:

```yaml
- name: Checkout code
  uses: actions/checkout@v4
  with:
    submodules: recursive  # This fetches submodules
```

## Docker Integration

The Dockerfile copies contracts into the image:

```dockerfile
# Copy contracts (if vendored or submodule)
COPY contracts ./contracts
```

Ensure contracts are available before building the Docker image.

## Versioning Best Practices

### Development
- Use `main` branch or `latest` tag
- Allows rapid iteration

### Staging
- Pin to specific pre-release tags (e.g., `v1.0.0-rc.1`)
- Test contract changes before production

### Production
- Always use stable version tags (e.g., `v1.0.0`)
- Never use `main` or `latest`
- Document version in deployment notes

### Version Matrix

Keep track of which contracts version is deployed where:

| Environment | Service Version | Contracts Version |
|-------------|----------------|-------------------|
| Development | latest         | main              |
| Staging     | v1.2.0         | v1.1.0-rc.1       |
| Production  | v1.1.0         | v1.0.0            |

## Troubleshooting

### Submodule Not Initialized

```bash
# Symptom: contracts/ directory is empty
git submodule update --init --recursive
```

### Wrong Contracts Version

```bash
# Check current version
cd contracts && git describe --tags

# Switch to correct version
git checkout v1.0.0
cd ..
git add contracts
git commit -m "Fix contracts version to v1.0.0"
```

### Schema Not Found Errors

```bash
# Verify CONTRACTS_PATH
echo $CONTRACTS_PATH

# Check files exist
ls -la $CONTRACTS_PATH/domain/vitals.json

# Verify path in .env matches actual location
```

### Submodule Conflicts

```bash
# Reset submodule to committed version
git submodule update --force

# Or completely reinitialize
git submodule deinit -f contracts
git submodule update --init
```
