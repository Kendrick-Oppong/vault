/**
 * Shared TypeScript types for Vault
 */

// Example: User types
export interface User {
  id: string
  email: string
  createdAt: Date
  updatedAt: Date
}

// Example: Password entry types
export interface PasswordEntry {
  id: string
  title: string
  username: string
  password: string
  url?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

// Add more shared types here as needed
