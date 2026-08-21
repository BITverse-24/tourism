import { test } from "node:test";
import assert from 'node:assert/strict';
import { Acks, Commands, Events } from "../src/structures/enums";
import { io } from 'socket.io-client'
import { createNewSessionMessage } from "../src/factory/Command";

const wsport = 5001

test(
    `recieve first discovery question`,
    async () => {
        const socket = io(`http://localhost:${wsport}`);

        await new Promise<void>((resolve, reject) => {
            socket.on("connect", () => {
                socket.emit(
                    Commands.SESSION_START,
                    createNewSessionMessage({
                        message_id: "test-msg-id",
                        command_id: "test-command-id",
                        occurred_at: "test-occurred-at",
                        payload: {
                            session_id: null,
                        },
                    })
                );
            });
            socket.on(Acks.COMMAND_ACCEPTED, (data) => {
                console.log("COMMAND ACCEPTED | data: " + JSON.stringify(data))
            });

            socket.on(Events.DISCOVERY_QUESTION, (data) => {
                console.log("RECIEVED DISCOVERY QUESTION | data: " + JSON.stringify(data))
                socket.close();
                try {
                    assert.ok(data);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            socket.on(Acks.COMMAND_REJECTED, (data) => {
                socket.close();
                reject(
                    new Error(
                        `Command rejected: ${JSON.stringify(data)}`
                    )
                );
            });
        });
    }
);
