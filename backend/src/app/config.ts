import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HTTPPORT: z.coerce.number().int().min(1).max(65535).default(3000),
    WSPORT: z.coerce.number().int().min(1).max(65535).default(3001),
    AGENT_API_KEY: z.string(),
    AGENT_MODEL: z.string().default('gemini-3.6-flash'),
    // AGENT_REASONING_EFFORT is for Agent 2 (candidate-design) only.
    // Agent 1 (discovery, ai/discovery.ts) always uses thinkingBudget: 0 (no reasoning) and ignores this.
    AGENT_REASONING_EFFORT: z.enum(['low', 'medium', 'high']).default('medium'),
    AGENT_API_URL: z.string().default(''),
    AGENT_TIMEOUT_MS: z.coerce.number().default(20_000_000),
    CITY_KNOWLEDGEBASE_CSV: z.string(),
    ATTRACTIONS_KNOWLEDGEBASE_SQLITE: z.string(),
    AGENT_2_MAX_CANDIDATES: z.coerce.number().default(1),
    AGENT_2_MAX_TOOL_CALLS: z.coerce.number().default(3),
    AGENT_2_MAX_ROWS_PER_TOOL_CALL: z.coerce.number().default(50),
    // MONGO_URI: z.string().trim().min(1, 'MONGO_URI is required'),
    // DB_NAME: z.string().trim().min(1).default('api'),
    // ADMIN_API_TOKEN: z.string().trim().min(16, 'ADMIN_API_TOKEN must be at least 16 characters'),
    // ADMIN_USERNAME: z.string().trim().min(1).default('admin'),
    CORS_ORIGIN: z.string().trim().default(''),
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
    RATE_LIMIT_MAX: z.coerce.number().int().positive().default(60),
    JSON_BODY_LIMIT: z.string().trim().min(1).default('100kb'),
    TRUST_PROXY: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
});

export interface AppConfig {
    nodeEnv: 'development' | 'test' | 'production';
    httpPort: number;
    wsPort: number;
    agent_api_key: string;
    agent_model: string;
    /** For Agent 2 (candidate-design) only — Agent 1 (discovery) always uses thinkingBudget: 0 and ignores this. */
    agent_reasoning_effort: 'low' | 'medium' | 'high';
    agent_api_url: string;
    agent_timeout_ms: number;
    city_knowledgebase_csv_path: string;
    attractions_knowledgebase_sqlite_path: string;
    agent_2_max_candidates: number;
    agent_2_max_tool_calls: number;
    agent_2_max_rows_per_tool_call: number;
    // mongoUri: string;
    // dbName: string;
    // adminApiToken: string;
    // adminUsername: string;
    allowedOrigins: string[];
    rateLimitWindowMs: number;
    rateLimitMax: number;
    jsonBodyLimit: string;
    trustProxy: boolean;
}

function parseAllowedOrigins(value: string): string[] {
    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
    const parsed = envSchema.safeParse(env);

    if (!parsed.success) {
        const message = parsed.error.issues
            .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
            .join('; ');

        throw new Error(`Invalid environment configuration: ${message}`);
    }

    const data = parsed.data;

    return {
        nodeEnv: data.NODE_ENV,
        httpPort: data.HTTPPORT,
        wsPort: data.WSPORT,
        agent_api_key: data.AGENT_API_KEY,
        agent_model: data.AGENT_MODEL,
        agent_reasoning_effort: data.AGENT_REASONING_EFFORT,
        agent_api_url: data.AGENT_API_URL,
        agent_timeout_ms: data.AGENT_TIMEOUT_MS,
        city_knowledgebase_csv_path: data.CITY_KNOWLEDGEBASE_CSV,
        attractions_knowledgebase_sqlite_path: data.ATTRACTIONS_KNOWLEDGEBASE_SQLITE,
        agent_2_max_candidates: data.AGENT_2_MAX_CANDIDATES,
        agent_2_max_tool_calls: data.AGENT_2_MAX_TOOL_CALLS,
        agent_2_max_rows_per_tool_call: data.AGENT_2_MAX_ROWS_PER_TOOL_CALL,
        // mongoUri: data.MONGO_URI,
        // dbName: data.DB_NAME,
        // adminApiToken: data.ADMIN_API_TOKEN,
        // adminUsername: data.ADMIN_USERNAME,
        allowedOrigins: parseAllowedOrigins(data.CORS_ORIGIN),
        rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
        rateLimitMax: data.RATE_LIMIT_MAX,
        jsonBodyLimit: data.JSON_BODY_LIMIT,
        trustProxy: data.TRUST_PROXY,
    };
}
