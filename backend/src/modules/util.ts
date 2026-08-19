import { timingSafeEqual } from 'node:crypto';
import type { CorsOptions } from 'cors';
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { BadRequestError } from '../app/errors';
import type { AppConfig } from '../app/config';
import { Command } from '../structures/enums';

export function buildCorsOptions(config: AppConfig): CorsOptions {
    return {
        origin(origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) {
            if (!origin) {
                callback(null, true);
                return;
            }

            if (config.allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new BadRequestError('Origin not allowed'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    };
}

export function createRateLimiter(config: AppConfig) {
    return rateLimit({
        windowMs: config.rateLimitWindowMs,
        limit: config.rateLimitMax,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        keyGenerator: (request: Request) => {
            const forwardedFor = request.headers['x-forwarded-for'];
            const headerValue = Array.isArray(forwardedFor)
                ? forwardedFor[0]
                : forwardedFor;
            const forwardedIp = headerValue?.split(',')[0]?.trim();

            return forwardedIp || ipKeyGenerator(request.ip || 'unknown');
        },
        handler: (_request, response) => {
            response.status(429).json({
                error: 'Too Many Requests',
            });
        },
    });
}

export function compareSecrets(expected: string, actual: string): boolean {
    const expectedBuffer = Buffer.from(expected);
    const actualBuffer = Buffer.from(actual);

    if (expectedBuffer.length !== actualBuffer.length) {
        return false;
    }

    return timingSafeEqual(expectedBuffer, actualBuffer);
}

export function parseBearerToken(authorizationHeader?: string): string | null {
    if (!authorizationHeader?.startsWith('Bearer ')) {
        return null;
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    return token.length > 0 ? token : null;
}

export function isValidCommandType(type: unknown): type is Command {
    return Object.values(Command).includes(type as Command);
}

export function generateUUID() {
    return crypto.randomUUID();
}
