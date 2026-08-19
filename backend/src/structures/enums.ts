// TOOOOOOOO DOOOOOOOOOOOOOOO

export enum Command {
    SESSION_START = "session.start",
    DISCOVERY_ANSWER = 'discovery.answer',
    RUN_CANCEL = 'run.cancel',
    SESSION_CLOSE = 'session.close',
    PROFILE_CONFIRM = 'profile.confirm',
    PROFILE_REQUEST_CHANGES = "profile.request_changes",
    DECISION_RESPOND = 'decision.respond',
}

export enum Event {
}

export enum Acknowledge {
    COMMAND_ACCEPTED = 'command.accepted',
    COMMAND_REJECTED = 'command.rejected',
}

export enum Error {
    ERROR = "error"
} 

export enum RejectionCode {
    INVALID_ENVELOPE = "invalid_envelope",
    UNSUPPORTED_MESSAGE_TYPE = "unsupported_message_type",
    SESSION_NOT_FOUND = "session_not_found",
    SESSION_EXPIRED = "session_expired",
    INVALID_WORKFLOW_STATE = "invalid_workflow_state",
    QUESTION_NOT_CURRENT = "question_not_current",
    INVALID_SELECTION = "invalid_selection",
    FREE_TEXT_NOT_ALLOWED = "free_text_not_allowed",
    PROFILE_NOT_READY = "profile_not_ready",
    PROFILE_REVISION_CONFLICT = "profile_revision_conflict",
    INVALID_REPLAN_REQUEST = "invalid_replan_request",
    RUN_CANCELLED = "run_cancelled",
    COMMAND_ID_CONFLICT = "command_id_conflict",
}

export enum WorkflowStates {
    DISCOVERY = "discovery",
    PROFILE = "profile",
    PROFILE_REVIEW = "profile_review",
    PLANNING = "planning",
    PLAN_READY = "plan_ready",
    REPLANNING = "replanning",
    CANCELLED = "cancelled",
    EXPIRED = "expired",
    DECISION_REQUIRED = 'decision_required',
}
