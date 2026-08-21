
export enum Commands {
    SESSION_START = "session.start",
    DISCOVERY_ANSWER = 'discovery.answer',
    RUN_CANCEL = 'run.cancel',
    SESSION_CLOSE = 'session.close',
    PROFILE_CONFIRM = 'profile.confirm',
    PROFILE_REQUEST_CHANGES = "profile.request_changes",
    DECISION_RESPOND = 'decision.respond',
}

export enum Events {
    SESSION_EXPIRED = 'session.expired',
    WORKFLOW_COMPLETED = 'workflow.completed',
    DECISION_REQUEST = 'decision.request',
    PLANNING_STATUS = 'planning.status',
    PROFILE_READY = 'profile.ready',
    PROFILE_SNAPSHOT = 'profile.snapshot',
    DISCOVERY_QUESTION = 'discovery.question',
    SESSION_READY = 'session.ready',
    PLAN_SNAPSHOT = 'plan.snapshot',
}

export enum Acks {
    COMMAND_ACCEPTED = 'command.accepted',
    COMMAND_REJECTED = 'command.rejected',
}

export enum Errors {
    ERROR = "error"
} 

export enum MessageKinds {
    COMMAND = 'command',
    EVENT = 'event',
    ACK = 'ack',
    ERROR = 'error',
}

export enum RejectionCodes {
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

export enum DiscoveryAnsSelectionModes {
    SINGLE = 'single',
    MULTIPLE = 'multiple',
}

export enum DiscoveryFreeTextModes {
    DISABLED = 'disabled',
    OPTIONAL = 'optional',
    ONLY_IF_NO_OPTION = 'only_if_no_option',
    REQUIRED = 'required',
}

export enum PlanningPhases {
    PROFILE_VALIDATION = 'profile_validation',
    DESTINATION_DESIGN = 'destination_design',
    EXPERIENCE_SELECTION = 'experience_selection',
    MOBILITY = 'mobility',
    COST = 'cost',
    SIMULATION = 'simulation',
    OPTIMIZATION = 'optimization',
    DECISION_REQUIRED = 'decision_required',
    EXPLANATION = 'explanation',
    REPLANNING = 'replanning',
}

export enum PlanningStatus {
    QUEUED = 'queued',
    RUNNING = 'running',
    COMPLETED = 'completed',
    FAILED = 'failed',
}

export enum WorkflowOutcomes {
    FINAL_PLAN_AVAILABLE = 'final_plan_available',
    CANCELLED = 'cancelled',
}

export enum ProfileSnapshotStates {
    DRAFT = 'draft',
    READY = 'ready',
    CONFIRMED = 'confirmed'
}

export enum PlanSnapshotStates {
    DRAFT = 'draft',
    FINAL = 'final',
}
