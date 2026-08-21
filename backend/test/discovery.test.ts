import { test } from "node:test";
import assert from 'node:assert/strict';
import { Acks, Commands, Events } from "../src/structures/enums";
import { io } from 'socket.io-client'
import { createDiscoveryAnswerMessage, createNewSessionMessage } from "../src/factory/Command";
import { DiscoveryQuestionMessage, ProfileSnapshotMessage } from "../src/structures/EventMessage";
import { generateUUID } from "../src/modules/util";
import { DiscoveryAnswerMessage } from "../src/structures/CommandMessage";

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
                console.log("\n\nCOMMAND ACCEPTED | data: " + JSON.stringify(data))
            });

            socket.on(Acks.COMMAND_REJECTED, (data) => {
                socket.close();
                reject(
                    new Error(
                        `!!! COMMAND REJECTED: ${JSON.stringify(data)}`
                    )
                );
            });


            socket.on(Events.DISCOVERY_QUESTION, (data: DiscoveryQuestionMessage) => {
                console.log("\n\nRECIEVED DISCOVERY QUESTION | data: " + JSON.stringify(data))
                let selected_options: string[] = []
                let free_text: string = ""
                
                const questionId = data.payload.question_id.toLowerCase();
                const prompt = data.payload.prompt.toLowerCase();
                
                // Provide meaningful answers based on the question
                if (questionId.includes("destination") || prompt.includes("where") || prompt.includes("travel")) {
                    // Destination question
                    if (data.payload.options.length == 0) {
                        free_text = "Mumbai";
                    } else {
                        selected_options.push(data.payload.options[0].option_id);
                    }
                } else if (questionId.includes("duration") || questionId.includes("days") || prompt.includes("how long") || prompt.includes("stay")) {
                    // Duration question
                    if (data.payload.options.length > 0) {
                        // Select first option that contains numbers
                        const durationOption = data.payload.options.find(opt => 
                            opt.label.match(/\d/) || opt.description.match(/\d/)
                        );
                        if (durationOption) {
                            selected_options.push(durationOption.option_id);
                        } else {
                            selected_options.push(data.payload.options[0].option_id);
                        }
                    } else {
                        free_text = "3 days";
                    }
                } else if (questionId.includes("date") || questionId.includes("timing") || questionId.includes("when") || prompt.includes("when")) {
                    // Date/timing question
                    if (data.payload.options.length > 0) {
                        // Select first option
                        selected_options.push(data.payload.options[0].option_id);
                    } else {
                        free_text = "November 2024";
                    }
                } else if (questionId.includes("party") || questionId.includes("who") || prompt.includes("who") || prompt.includes("traveling")) {
                    // Party size question
                    if (data.payload.options.length > 0) {
                        const soloOption = data.payload.options.find(opt => 
                            opt.label.toLowerCase().includes("solo") || opt.description.toLowerCase().includes("solo")
                        );
                        if (soloOption) {
                            selected_options.push(soloOption.option_id);
                        } else {
                            selected_options.push(data.payload.options[0].option_id);
                        }
                    } else {
                        free_text = "Solo traveler";
                    }
                } else if (questionId.includes("budget") || prompt.includes("budget") || prompt.includes("spend")) {
                    // Budget question
                    if (data.payload.options.length > 0) {
                        selected_options.push(data.payload.options[0].option_id);
                    } else {
                        free_text = "Budget-conscious";
                    }
                } else if (questionId.includes("purpose") || questionId.includes("focus") || questionId.includes("experience") || prompt.includes("purpose") || prompt.includes("focus")) {
                    // Purpose/experience question
                    if (data.payload.options.length > 0) {
                        selected_options.push(data.payload.options[0].option_id);
                    } else {
                        free_text = "History and culture";
                    }
                } else {
                    // Default: select first option or send generic answer
                    if (data.payload.options.length == 0) {
                        free_text = "Mumbai";
                    } else {
                        selected_options.push(data.payload.options[0].option_id);
                    }
                }

                const ansMsg: DiscoveryAnswerMessage = 
                    createDiscoveryAnswerMessage({
                        message_id: `msg_${generateUUID()}`,
                        session_id: data.session_id,
                        run_id: data.run_id,
                        command_id: `cmd_${generateUUID()}`,
                        occurred_at: new Date().toISOString(),
                        payload: {
                            question_id: data.payload.question_id,
                            selected_option_ids: selected_options,
                            free_text: free_text
                        }
                    })

                console.log("\n\nSENDING ANSWER | ansmsg: " + JSON.stringify(ansMsg))
                socket.emit(
                    Commands.DISCOVERY_ANSWER,
                    ansMsg
                )
            });

            socket.on(Events.PROFILE_SNAPSHOT, (data: ProfileSnapshotMessage) => {
                console.log("\n\nRECIEVED PROFILE SNAPSHOT | data: " + JSON.stringify(data))
            })

            socket.on(Events.PROFILE_READY, (data) => {

                console.log("\n\nPROFILE WAS CONFIRMED !!! | data: " + JSON.stringify(data))

                socket.close();
                try {
                    assert.ok(data);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            })

        });
    }
);
