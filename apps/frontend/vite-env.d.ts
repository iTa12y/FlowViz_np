// Vite client types
// These provide type definitions for import.meta.env and other Vite-specific features

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

