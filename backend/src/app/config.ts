import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    HTTPPORT: z.coerce.number().int().min(1).max(65535).default(3000),
    WSPORT: z.coerce.number().int().min(1).max(65535).default(3001),
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
