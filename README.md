# Vault Monorepo

A password management application with both desktop and web interfaces.

## Project Structure

```
vault/
├── apps/
│   ├── desktop/    # Electron desktop application
│   └── web/        # Next.js landing page
└── packages/       # Shared packages
    ├── config/     # Shared configuration and constants
    ├── types/      # Shared TypeScript types
    └── ui/         # Shared UI components
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- pnpm 8+

### Installation

Install dependencies for all apps:

```bash
pnpm install
```

### Development

Run the desktop app:

```bash
pnpm dev:desktop
```

Run the web landing page:

```bash
pnpm dev:web
```

### Build

Build the desktop app:

```bash
pnpm build:desktop
```

Build the web app:

```bash
pnpm build:web
```

## Apps

### desktop

An Electron application with React and TypeScript for secure password management.

**Tech Stack:**
- Electron
- React 19
- TypeScript
- Vite
- better-sqlite3

### web

A modern landing page built with Next.js to showcase the desktop application.

**Tech Stack:**
- Next.js 15
- React 19
- TypeScript
- Tailwind CSS

## Packages

### @vault/config

Shared configuration and constants used across all applications.

### @vault/types

Shared TypeScript types and interfaces for consistent data structures.

### @vault/ui

Reusable UI components that can be used in both desktop and web applications.

## Using Shared Packages

To use a shared package in your app, add it as a dependency:

```json
{
  "dependencies": {
    "@vault/config": "workspace:*",
    "@vault/types": "workspace:*",
    "@vault/ui": "workspace:*"
  }
}
```

Then import:

```typescript
import { APP_NAME } from '@vault/config'
import type { User } from '@vault/types'
import { Button } from '@vault/ui'
```

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)
