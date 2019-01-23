import { SignalResponse } from "./signalResponse";

export class AddToRoomRequest extends SignalResponse {
    answer: string;
    client: string;

    constructor(parameters: {answer: string, client: string}) {
        super('add_to_room');
        this.answer = parameters.answer;
        this.client = parameters.client;
    }
}
