import { SignalRequest } from "./signalRequest";

export class CreateRoomRequest extends SignalRequest {
    constructor() {
        super('create_room');
    }
}