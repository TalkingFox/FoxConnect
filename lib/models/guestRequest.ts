import { SignalResponse } from "./signalResponse";

export interface GuestRequest extends SignalResponse {
    offer: string;
    client: string;
}