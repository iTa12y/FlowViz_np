// Vite client types
// These provide type definitions for import.meta.env and other Vite-specific features

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_AUTH_API_URL?: string;
  readonly VITE_CONFLUENCE_SPACE?: string;
  readonly VITE_FILE_CONTENT_MIN_LENGTH?: string;
  readonly VITE_FILE_CONTENT_MAX_LENGTH?: string;
  readonly VITE_ALLOW_INSECURE_HOSTS?: string;
  // Add other env variables here as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

