# Vault Workspace Guide

This is a pnpm monorepo workspace for the Vault project.

## Structure

```
vault/
├── apps/
│   ├── desktop/          # Electron desktop app
│   └── web/             # Next.js landing page
└── packages/
    ├── @vault/config/   # Shared configuration
    ├── @vault/types/    # Shared TypeScript types
    └── @vault/ui/       # Shared UI components
```

## Getting Started

1. **Install dependencies** (from root):
   ```bash
   pnpm install
   ```

2. **Run development servers**:
   ```bash
   # Desktop app
   pnpm dev:desktop
   
   # Web landing page (after setting up with create-next-app)
   pnpm dev:web
   ```

3. **Build for production**:
   ```bash
   # Desktop app
   pnpm build:desktop
   
   # Web app
   pnpm build:web
   ```

## Working with Packages

### Adding a shared package to an app

In `apps/desktop/package.json` or `apps/web/package.json`:

```json
{
  "dependencies": {
    "@vault/config": "workspace:*",
    "@vault/types": "workspace:*",
    "@vault/ui": "workspace:*"
  }
}
```

Then run `pnpm install` from the root.

### Using shared packages

```typescript
// Import types
import type { User, PasswordEntry } from '@vault/types'

// Import config
import { APP_NAME, APP_VERSION } from '@vault/config'

// Import UI components
import { Button } from '@vault/ui'
```

### Creating new shared packages

1. Create directory: `packages/new-package/`
2. Add `package.json` with name `@vault/new-package`
3. Add `tsconfig.json` for TypeScript support
4. Create `src/index.ts` as entry point
5. Run `pnpm install` from root

## Common Commands

```bash
# Install dependencies for all workspaces
pnpm install

# Run command in specific workspace
pnpm --filter desktop dev
pnpm --filter web build

# Run command in all workspaces
pnpm -r build
pnpm -r test

# Add dependency to specific workspace
pnpm --filter desktop add <package>
pnpm --filter web add -D <package>

# Format all code
pnpm format

# Lint all code
pnpm lint
```

## Workspace Benefits

✅ **Code Sharing**: Share types, components, and utilities between apps  
✅ **Consistent Dependencies**: Shared dependencies are installed once  
✅ **Type Safety**: TypeScript types work across package boundaries  
✅ **Easier Refactoring**: Move code between packages seamlessly  
✅ **Better Developer Experience**: Single install, unified tooling
