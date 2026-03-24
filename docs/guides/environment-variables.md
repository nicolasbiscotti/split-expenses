## 1. **Individual Environment Variables**

### Create/Set Variables:

```bash
# Temporary (current session only)
export MY_VAR="hello world"
export API_KEY="sk-12345"
export DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# With spaces (use quotes)
export MULTI_WORD="This has spaces"

# Numeric values
export PORT=3000
export TIMEOUT=30
```

### Read Variables:

```bash
# Read single variable
echo $MY_VAR
echo ${API_KEY}

# Check if variable exists
echo ${MY_VAR:?"Variable not set"}

# Read with default value
echo ${UNDEFINED_VAR:-"default value"}

# List all environment variables
env
printenv

# Search for specific variable
env | grep API
printenv | grep -i key

# See specific variable
printenv MY_VAR
```

### Delete/Unset Variables:

```bash
# Remove single variable
unset MY_VAR
unset API_KEY

# Remove multiple
unset VAR1 VAR2 VAR3

# Check if deleted
echo ${MY_VAR:-"Variable deleted"}
```

## 2. **From `.env` File**

### Create `.env` file:

```bash
# Create .env file
cat > .env << 'EOF'
# Application settings
API_KEY=sk-1234567890
DATABASE_URL=postgresql://user:pass@localhost/db
DEBUG=true
PORT=3000

# Feature flags
ENABLE_CACHE=true
MAX_CONNECTIONS=10

# Secrets
JWT_SECRET=super-secret-key-123
EOF

# Or using tee
tee .env > /dev/null << 'EOF'
NODE_ENV=production
API_URL=https://api.example.com
EOF
```

### Read from `.env` file:

```bash
# Method 1: Source the file (loads into current shell)
source .env
# or
. .env

# Method 2: Use export with grep
export $(grep -v '^#' .env | xargs)

# Method 3: Load and keep variables
set -a
source .env
set +a

# Method 4: Read specific variable from file
grep '^API_KEY=' .env | cut -d '=' -f2-
sed -n 's/^API_KEY=//p' .env
awk -F= '/^API_KEY/{print $2}' .env
```

### Update `.env` file:

```bash
# Update existing variable
sed -i 's/^PORT=.*/PORT=8080/' .env

# Add new variable if not exists
if ! grep -q "^NEW_VAR=" .env; then
  echo "NEW_VAR=value" >> .env
fi

# Update or add variable
grep -q "^DEBUG=" .env && sed -i 's/^DEBUG=.*/DEBUG=false/' .env || echo "DEBUG=false" >> .env
```

### Delete from `.env` file:

```bash
# Remove specific variable
sed -i '/^API_KEY=/d' .env
grep -v '^DATABASE_URL=' .env > .env.tmp && mv .env.tmp .env

# Remove multiple variables
sed -i '/^DEBUG=/d; /^PORT=/d' .env

# Clear entire .env file
> .env  # Empty the file
rm .env  # Delete the file
```

## 3. **Advanced Operations**

### Load `.env` with error handling:

```bash
# Safe load function
load_env() {
  if [ -f .env ]; then
    # Export variables, ignoring comments and empty lines
    export $(grep -v '^#' .env | grep -v '^$' | xargs)
    echo "✅ Environment variables loaded from .env"
  else
    echo "⚠️  .env file not found"
  fi
}

# Use it
load_env
```

### Create .env from template:

```bash
# Create .env from .env.example
cp .env.example .env

# Generate secure random values
echo "JWT_SECRET=$(openssl rand -hex 32)" >> .env
echo "API_KEY=$(uuidgen)" >> .env
```

### One-liners for common tasks:

```bash
# Set all variables from .env
export $(cat .env | xargs)

# List all variables from .env file
cat .env | grep -v '^#' | grep -v '^$'

# Check if variable is set in .env
grep -q "^DATABASE_URL=" .env && echo "Exists" || echo "Missing"

# Increment PORT in .env
PORT=$(grep '^PORT=' .env | cut -d= -f2)
sed -i "s/^PORT=.*/PORT=$((PORT + 1))/" .env
```

## 4. **Using `dotenv` or `envsubst`**

### With `envsubst` (substitute env vars in files):

```bash
# Install if needed
sudo apt-get install gettext  # Debian/Ubuntu
sudo yum install gettext      # RHEL/CentOS

# Create template
cat > config.template << 'EOF'
server {
  listen ${PORT};
  api_key: ${API_KEY};
}
EOF

# Substitute variables
export PORT=3000 API_KEY="abc123"
envsubst < config.template > config.yml
```

### Create Python script to manage .env:

```python
#!/usr/bin/env python3
import os
from pathlib import Path

def set_env(key, value):
    env_file = Path('.env')
    lines = env_file.read_text().splitlines() if env_file.exists() else []

    # Update or add
    found = False
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}"
            found = True
            break

    if not found:
        lines.append(f"{key}={value}")

    env_file.write_text('\n'.join(lines))
    os.environ[key] = value

def get_env(key):
    return os.getenv(key)

def del_env(key):
    env_file = Path('.env')
    if env_file.exists():
        lines = [line for line in env_file.read_text().splitlines()
                if not line.startswith(f"{key}=")]
        env_file.write_text('\n'.join(lines))
    os.environ.pop(key, None)
```

## 5. **Session Persistence**

For current session only:

```bash
# All above methods are session-only
# They disappear when terminal closes
```

For permanent storage (add to shell config):

```bash
# Add to ~/.bashrc or ~/.bash_profile or ~/.zshrc
echo 'export API_KEY="your-key"' >> ~/.bashrc
source ~/.bashrc
```

## 6. **Quick Reference Table**

| Operation            | Command                            |
| -------------------- | ---------------------------------- |
| **Set**              | `export VAR=value`                 |
| **Read**             | `echo $VAR` or `printenv VAR`      |
| **Delete**           | `unset VAR`                        |
| **Load .env**        | `source .env` or `. .env`          |
| **Save to .env**     | `echo "VAR=value" >> .env`         |
| **Update .env**      | `sed -i 's/^VAR=.*/VAR=new/' .env` |
| **Delete from .env** | `sed -i '/^VAR=/d' .env`           |
