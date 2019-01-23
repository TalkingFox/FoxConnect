import { SignalRequest } from "./signalRequest";

export class AddToRoomRequest extends SignalRequest {
    answer: string;
    client: string;

    constructor(parameters: {answer: string, client: string}) {
        super('add_to_room');
        this.answer = parameters.answer;
        this.client = parameters.client;
    }
}
