declare module "bun" {
  interface Env {
    GROQ_API_KEY: string;
    LLM_MODEL: string;
    DB_NAME: string;
  }
}