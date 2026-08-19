import { timingSafeEqual } from 'node:crypto';
import type { CorsOptions } from 'cors';
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { BadRequestError } from '../app/errors';
import type { AppConfig } from '../app/config';
import { MessageEnvelope, MessageEnvelopeSchema } from '../structures/MessageEnvelope';
import { z } from 'zod';
import { CommandRejectedMessage, CommandRejectedSchema } from '../structures/AckMessage';
import { Acknowledge, Command, RejectionCode, WorkflowStates } from '../structures/enums';

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

export function isValidCommandForWorkflow(type: Command, workflow: WorkflowStates): boolean {
    switch (workflow) {

            // discovery state
        case WorkflowStates.DISCOVERY:
            if (
                [Command.DISCOVERY_ANSWER, Command.RUN_CANCEL, Command.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;

            // profile_review state
        case WorkflowStates.PROFILE_REVIEW:
            if (
                [Command.PROFILE_CONFIRM, Command.PROFILE_REQUEST_CHANGES, Command.RUN_CANCEL, Command.SESSION_CLOSE].includes(type)
            ) return true; break;

            // planning state
        case WorkflowStates.PLANNING:
            if (
                [Command.RUN_CANCEL, Command.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;
            
            // decision_required state
        case WorkflowStates.DECISION_REQUIRED:
            if (
                [Command.DECISION_RESPOND, Command.RUN_CANCEL, Command.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;

            // plan_ready state
        case WorkflowStates.PLAN_READY:
            if (
                [Command.RUN_CANCEL, Command.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;

            // replanning state
        case WorkflowStates.REPLANNING:
            return false // cos replanning not supported
            // if (
            //     [Command.RUN_CANCEL, Command.SESSION_CLOSE]
            //         .includes(type)
            // ) return true; break;

            // cancelled state
        case WorkflowStates.CANCELLED:
            if (
                [Command.SESSION_START, Command.SESSION_CLOSE]
                    .includes(type)
            ) return true; break;

            // expired state
        case WorkflowStates.EXPIRED:
            if (
                [Command.SESSION_START]
                    .includes(type)
            ) return true; break;
    }

    return false;
}

export function validateCommandDataFormat<T extends z.ZodObject>(
    data: MessageEnvelope,
    schema: T,
    workflow_state: WorkflowStates,
): { valid: boolean, ack?: CommandRejectedMessage } {

    const parseRes = schema.safeParse(data)

    if (!parseRes.success) {

        let ret = {
            valid: false,
            ack: {
                message_id: data.message_id,
                session_id: data.session_id,
                run_id: data.run_id,
                command_id: data.command_id,
                sequence: ++data.sequence,
                occurred_at: new Date().toISOString(),
                type: CommandRejectedSchema.shape.type.value,
                kind: CommandRejectedSchema.shape.kind.value,
                workflow_state: workflow_state,
                accepted: CommandRejectedSchema.shape.accepted.value,
                code: RejectionCode.INVALID_ENVELOPE,
                message: `invalid envelope format for ${schema.shape.type}`,
                retryable: true,
                recovery: {}
            }
        }

        if (!isValidCommandType(data.type)) {
            ret.ack.code = RejectionCode.UNSUPPORTED_MESSAGE_TYPE
            ret.ack.message = `${data.type} is not a valid message type`
        }
        else if (!isValidCommandForWorkflow(data.type, workflow_state)) {
            ret.ack.code = RejectionCode.INVALID_WORKFLOW_STATE
            ret.ack.message = `not a valid command in current workflow state: ${workflow_state}`
        }

        return ret;
    }

    return { valid: true };
}

