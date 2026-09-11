/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly SUPABASE_URL?: string;
	readonly SUPABASE_ANON_KEY?: string;
	readonly VITE_WS_URL?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
