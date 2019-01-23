import { SignalRequest } from "./signalRequest";

export class JoinRoomRequest extends SignalRequest {
    public room: string;
    public offer: string;

    constructor(parameters: {room: string, offer: string}) {
        super('join_room');
        this.room = parameters.room;
        this.offer = parameters.offer;
    }
}
