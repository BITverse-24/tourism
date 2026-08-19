import { Command, Event, Acknowledge, Error } from "./enums";

export type ServiceResult = {
    event: string;
    data: Record<string, unknown>;
}

export type MessageType = Command | Event | Acknowledge | Error
