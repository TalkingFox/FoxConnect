import { SignalResponse } from "./signalResponse";

export interface SignalError extends SignalResponse {
    error: string;
}