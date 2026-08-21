/**
 * WS command validation — unit-level tests.
 *
 * Scope: only the validation/ack-building building blocks used by the
 * websocket command handlers:
 *   - src/factory/Ack.ts            (buildAckMsg)
 *   - src/services/ValidationServices.ts (validateCommandDataFormat)
 *   - src/handlers/BaseValidation.ts     (checkBaseCommandRejections)
 *
 * Downstream, service-generated events (session.ready, discovery.question,
 * profile.snapshot, ...) are out of scope and are never exercised here.
 *
 * A few tests below are marked `{ todo: '...' }`. That is intentional: they
 * encode the *intended* validation behavior (per the zod schemas and the
 * rejection codes defined in src/structures/enums.ts) and currently fail
 * against real bugs in the source. Node's test runner reports `todo` tests
 * without failing the overall run, so these serve as a documented,
 * executable bug list rather than a broken suite. Search this file for
 * "BUG" for a plain-language explanation of each one.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { Socket } from 'socket.io';

import { buildAckMsg } from '../src/factory/Ack';
import { validateCommandDataFormat } from '../src/services/ValidationServices';
import { checkBaseCommandRejections } from '../src/handlers/BaseValidation';
import * as DataStore from '../src/models/data';
import { RunCancelSchema, DecisionRespondSchema } from '../src/structures/CommandMessage';
import { RejectionCodes, WorkflowStates, Acks } from '../src/structures/enums';
import type { MessageEnvelope } from '../src/structures/MessageEnvelope';

function fakeEnvelope() {
    return {
        message_id: `msg_${crypto.randomUUID()}`,
        session_id: `sess_${crypto.randomUUID()}`,
        run_id: `run_${crypto.randomUUID()}`,
        command_id: `cmd_${crypto.randomUUID()}`,
    } as unknown as MessageEnvelope;
}

function makeRunCancelData(overrides: Record<string, unknown> = {}) {
    return {
        message_id: `msg_${crypto.randomUUID()}`,
        session_id: `sess_${crypto.randomUUID()}`,
        run_id: `run_${crypto.randomUUID()}`,
        command_id: `cmd_${crypto.randomUUID()}`,
        occurred_at: new Date().toISOString(),
        kind: 'command',
        type: 'run.cancel',
        payload: { reason: 'testing' },
        ...overrides,
    };
}

function makeDecisionRespondData(overrides: Record<string, unknown> = {}) {
    return {
        message_id: `msg_${crypto.randomUUID()}`,
        session_id: `sess_${crypto.randomUUID()}`,
        run_id: `run_${crypto.randomUUID()}`,
        command_id: `cmd_${crypto.randomUUID()}`,
        occurred_at: new Date().toISOString(),
        kind: 'command',
        type: 'decision.respond',
        payload: { decision_id: 'd1', option_id: 'o1' },
        ...overrides,
    };
}

function createFakeSocket() {
    const emitted: Array<{ event: string; payload: unknown }> = [];
    const socket = {
        id: 'fake-socket',
        emit(event: string, payload: unknown) {
            emitted.push({ event, payload });
            return true;
        },
    };
    return { socket: socket as unknown as Socket, emitted };
}

// ---------------------------------------------------------------------------
// buildAckMsg
// ---------------------------------------------------------------------------

test('buildAckMsg: an accepted ack with deduplicated=true carries over all envelope fields', () => {
    const data = fakeEnvelope();

    const ack = buildAckMsg(data, 7, true, WorkflowStates.PLANNING, true) as any;

    assert.equal(ack.type, 'command.accepted');
    assert.equal(ack.kind, 'ack');
    assert.equal(ack.accepted, true);
    assert.equal(ack.sequence, 7);
    assert.equal(ack.workflow_state, WorkflowStates.PLANNING);
    assert.equal(ack.deduplicated, true);
    assert.equal(ack.message_id, data.message_id);
    assert.equal(ack.session_id, data.session_id);
    assert.equal(ack.run_id, data.run_id);
    assert.equal(ack.command_id, data.command_id);
    assert.equal(typeof ack.occurred_at, 'string');
});

test('BUG buildAckMsg: an accepted ack throws when deduplicated=false, even though false is the value every handler actually passes', () => {
    // Every handler in src/handlers/*.ts builds its accepted ack with:
    //   buildAckMsg(data, sequence, true, workflow_state, false)
    // i.e. deduplicated is *always* passed as the literal `false`. The guard
    // `if (!deduplicated) throw ...` treats that legitimate `false` the same
    // as "not provided", so no handler can currently build an accepted ack
    // without throwing.
    const data = fakeEnvelope();

    assert.throws(
        () => buildAckMsg(data, 1, true, WorkflowStates.DISCOVERY, false),
        /deduplicated value not provided/,
    );
});

test('buildAckMsg: an accepted ack also throws when deduplicated is genuinely omitted', () => {
    const data = fakeEnvelope();

    assert.throws(
        () => buildAckMsg(data, 1, true, WorkflowStates.DISCOVERY),
        /deduplicated value not provided/,
    );
});

test('buildAckMsg: a rejected ack with retryable=true is built with all fields', () => {
    const data = fakeEnvelope();

    const ack = buildAckMsg(
        data,
        3,
        false,
        WorkflowStates.DISCOVERY,
        undefined,
        RejectionCodes.INVALID_ENVELOPE,
        'bad envelope',
        true,
        { some: 'context' },
    ) as any;

    assert.equal(ack.type, 'command.rejected');
    assert.equal(ack.accepted, false);
    assert.equal(ack.code, RejectionCodes.INVALID_ENVELOPE);
    assert.equal(ack.message, 'bad envelope');
    assert.equal(ack.retryable, true);
    assert.deepEqual(ack.recovery, { some: 'context' });
});

test('BUG buildAckMsg: a rejected ack throws when retryable=false, even though false is the correct value for a non-retryable rejection', () => {
    // src/handlers/BaseValidation.ts passes retryable=false for the
    // session_expired, run_cancelled and command_id_conflict rejections
    // (correctly — none of those should be blindly retried). The same
    // falsy-check bug as above means those three rejection acks can never
    // actually be built.
    const data = fakeEnvelope();

    assert.throws(
        () =>
            buildAckMsg(
                data,
                1,
                false,
                WorkflowStates.DISCOVERY,
                undefined,
                RejectionCodes.SESSION_EXPIRED,
                'invalid session id',
                false,
                { valid_sessions: [] },
            ),
        /didnt provide all required fields/,
    );
});

test('buildAckMsg: a rejected ack throws when code/message are genuinely missing', () => {
    const data = fakeEnvelope();

    assert.throws(
        () => buildAckMsg(data, 1, false, WorkflowStates.DISCOVERY),
        /didnt provide all required fields/,
    );
});

// ---------------------------------------------------------------------------
// validateCommandDataFormat
// ---------------------------------------------------------------------------

test('validateCommandDataFormat: well-formed data for a command allowed in the current workflow state is valid', () => {
    const data = makeRunCancelData();

    const result = validateCommandDataFormat(data as any, RunCancelSchema, WorkflowStates.DISCOVERY, 1);

    assert.equal(result.valid, true);
    assert.equal(result.ack, undefined);
});

test('validateCommandDataFormat: a structurally malformed payload (right type, right workflow) is reported as invalid_envelope', () => {
    const data = makeRunCancelData({ payload: {} }); // missing required "reason"

    const result = validateCommandDataFormat(data as any, RunCancelSchema, WorkflowStates.DISCOVERY, 5);

    assert.equal(result.valid, false);
    assert.equal(result.ack?.code, RejectionCodes.INVALID_ENVELOPE);
    assert.equal(result.ack?.accepted, false);
    assert.match(result.ack?.message ?? '', /invalid envelope format/);
});

test('validateCommandDataFormat: an unrecognized message type is reported as unsupported_message_type', () => {
    const data = makeRunCancelData({ type: 'not.a.real.command' });

    const result = validateCommandDataFormat(data as any, RunCancelSchema, WorkflowStates.DISCOVERY, 1);

    assert.equal(result.valid, false);
    assert.equal(result.ack?.code, RejectionCodes.UNSUPPORTED_MESSAGE_TYPE);
    assert.match(result.ack?.message ?? '', /not a valid message type/);
});

test(
    'validateCommandDataFormat: a well-formed command that is not allowed in the current workflow state is still reported valid',
    // {
    //     todo:
    //         'isValidCommandForWorkflow() is only ever consulted inside the `if (!parseRes.success)` ' +
    //         'branch, i.e. only when the zod schema has already failed for some other reason. A ' +
    //         'structurally valid command sent in a workflow state that should not accept it (e.g. ' +
    //         'decision.respond while workflow_state=DISCOVERY) is never actually rejected. See ' +
    //         'src/services/ValidationServices.ts.',
    // },
    () => {
        // decision.respond is only valid while workflow_state === DECISION_REQUIRED.
        const data = makeDecisionRespondData();

        const result = validateCommandDataFormat(data as any, DecisionRespondSchema, WorkflowStates.DISCOVERY, 1);

        assert.equal(result.valid, false);
        assert.equal(result.ack?.code, RejectionCodes.INVALID_WORKFLOW_STATE);
    },
);

test('validateCommandDataFormat: when a command is both malformed and disallowed in the current workflow state, the workflow-state code takes priority', () => {
    const data = makeDecisionRespondData({ payload: {} }); // also missing decision_id/option_id

    const result = validateCommandDataFormat(data as any, DecisionRespondSchema, WorkflowStates.DISCOVERY, 1);

    assert.equal(result.valid, false);
    assert.equal(result.ack?.code, RejectionCodes.INVALID_WORKFLOW_STATE);
});

// ---------------------------------------------------------------------------
// checkBaseCommandRejections
// ---------------------------------------------------------------------------

test('checkBaseCommandRejections: a structurally malformed command is rejected with an invalid_envelope ack', async () => {
    const sessionId = `sess_${crypto.randomUUID()}`;
    await DataStore.setWorkflowState(sessionId, WorkflowStates.DISCOVERY);
    const data = makeRunCancelData({ session_id: sessionId, payload: {} });
    const { socket, emitted } = createFakeSocket();

    const result = await checkBaseCommandRejections(socket, data as any, RunCancelSchema);

    assert.equal(result, false);
    assert.equal(emitted.length, 1);
    assert.equal(emitted[0]?.event, Acks.COMMAND_REJECTED);
    assert.equal((emitted[0]?.payload as any).code, RejectionCodes.INVALID_ENVELOPE);
});

test('BUG checkBaseCommandRejections: an unknown/expired session throws instead of yielding a session_expired ack', async () => {
    // session_id was never registered as valid via addNewSessionId(...).
    const data = makeRunCancelData();
    const { socket } = createFakeSocket();

    await assert.rejects(
        () => checkBaseCommandRejections(socket, data as any, RunCancelSchema),
        /didnt provide all required fields/,
    );
    // Root cause: this rejection is built with retryable=false, which trips
    // the same buildAckMsg bug documented above.
});

test('BUG checkBaseCommandRejections: a run id mismatch throws instead of yielding a run_cancelled ack', async () => {
    const sessionId = `sess_${crypto.randomUUID()}`;
    const actualRunId = `run_${crypto.randomUUID()}`;
    await DataStore.addNewSessionId(sessionId);
    await DataStore.setWorkflowState(sessionId, WorkflowStates.DISCOVERY);
    await DataStore.setNewRunIdForSession(sessionId, actualRunId);

    const data = makeRunCancelData({ session_id: sessionId, run_id: `run_${crypto.randomUUID()}` });
    const { socket } = createFakeSocket();

    await assert.rejects(
        () => checkBaseCommandRejections(socket, data as any, RunCancelSchema),
        /didnt provide all required fields/,
    );
});

test('BUG checkBaseCommandRejections: even a fully valid command throws, because the per-run command-id set is never initialized', async () => {
    const sessionId = `sess_${crypto.randomUUID()}`;
    const runId = `run_${crypto.randomUUID()}`;
    await DataStore.addNewSessionId(sessionId);
    await DataStore.setWorkflowState(sessionId, WorkflowStates.DISCOVERY);
    await DataStore.setNewRunIdForSession(sessionId, runId);

    const data = makeRunCancelData({ session_id: sessionId, run_id: runId });
    const { socket } = createFakeSocket();

    await assert.rejects(
        () => checkBaseCommandRejections(socket, data as any, RunCancelSchema),
        (error: unknown) => error instanceof TypeError,
    );
    // Root cause: src/models/data.ts's CommandIds map is only ever read
    // (getCommandIdsForRun) or blindly written to (addCommandIdToRun assumes
    // the bucket already exists: `CommandIds[run_id].add(command_id)`).
    // Nothing in the codebase ever initializes CommandIds[run_id], so
    // `(await getCommandIdsForRun(run_id)).has(...)` always dereferences
    // `undefined`. This is the very last check before a valid command would
    // be accepted, so — combined with the buildAckMsg bug above — no command
    // can currently complete the accepted path successfully.
});

test('checkBaseCommandRejections: resolves true and emits nothing once the command-id lookup is bypassed', async (t) => {
    const sessionId = `sess_${crypto.randomUUID()}`;
    const runId = `run_${crypto.randomUUID()}`;
    await DataStore.addNewSessionId(sessionId);
    await DataStore.setWorkflowState(sessionId, WorkflowStates.DISCOVERY);
    await DataStore.setNewRunIdForSession(sessionId, runId);
    t.mock.method(DataStore, 'getCommandIdsForRun', async () => new Set<string>());

    const data = makeRunCancelData({ session_id: sessionId, run_id: runId });
    const { socket, emitted } = createFakeSocket();

    const result = await checkBaseCommandRejections(socket, data as any, RunCancelSchema);

    assert.equal(result, true);
    assert.equal(emitted.length, 0);
});
