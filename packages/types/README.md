# @vault/types

Shared TypeScript types and interfaces for Vault applications.

## Usage

```typescript
import type { User, PasswordEntry } from '@vault/types'

const user: User = {
  id: '1',
  email: 'user@example.com',
  createdAt: new Date(),
  updatedAt: new Date()
}
```

## Types

- **User**: User account types
- **PasswordEntry**: Password entry types

## Development

Add all shared types that are used across multiple apps here to ensure consistency.
