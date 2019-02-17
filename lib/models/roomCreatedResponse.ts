import { SignalResponse } from "./signalResponse";

export class RoomCreatedResponse extends SignalResponse {
    public room: string;
    public host_id: string;
}