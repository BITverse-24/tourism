export type LogContext = Record<string, unknown>;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function write(level: LogLevel, message: string, context: LogContext = {}): void {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...context,
    };

    const payload = JSON.stringify(entry);

    if (level === 'error') {
        console.error(payload);
        return;
    }

    if (level === 'warn') {
        console.warn(payload);
        return;
    }

    if (level === 'debug') {
        console.debug(payload);
        return;
    }

    console.log(payload);
}

export function serializeError(error: unknown): LogContext {
    if (error instanceof Error) {
        return {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
        };
    }

    return {
        errorMessage: String(error),
    };
}

export const logger = {
    debug(message: string, context?: LogContext): void {
        write('debug', message, context);
    },
    info(message: string, context?: LogContext): void {
        write('info', message, context);
    },
    warn(message: string, context?: LogContext): void {
        write('warn', message, context);
    },
    error(message: string, context?: LogContext): void {
        write('error', message, context);
    },
};
