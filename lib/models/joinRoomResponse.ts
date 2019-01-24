import { SignalResponse } from "./signalResponse";

export interface JoinRoomResponse extends SignalResponse {
    answer: string;
}