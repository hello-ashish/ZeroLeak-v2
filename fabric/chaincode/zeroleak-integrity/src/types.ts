export type EventType =
    | 'RESULT_COMMITMENT'
    | 'QUESTION_COMMITMENT'
    | 'EXAM_COMMITMENT'
    | 'SECURITY_EVENT';

export type EntityType =
    | 'Result'
    | 'Question'
    | 'Exam'
    | 'SecurityEvent';


export interface IntegrityCommitment {
    id: string;
    eventType: EventType;
    entityType: EntityType;
    entityId: string;
    dataHash: string;
    previousCommitmentHash: string;
    version: number;
    timestamp: string;
    application: string;
    txId?: string;
    blockTimestamp?: string;
}

export const VALID_EVENT_TYPES: readonly EventType[] = [
    'RESULT_COMMITMENT',
    'QUESTION_COMMITMENT',
    'EXAM_COMMITMENT',
    'SECURITY_EVENT',
];

export const VALID_ENTITY_TYPES: readonly EntityType[] = [
    'Result',
    'Question',
    'Exam',
    'SecurityEvent',
];

export const SHA256_PATTERN = /^[a-f0-9]{64}$/;

export const COMMITMENT_ID_PATTERN = /^(result|question|exam|securityevent)_[a-f0-9]{24}_v[1-9][0-9]*$/;

export const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/;
