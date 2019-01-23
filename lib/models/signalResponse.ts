export abstract class SignalResponse {
    constructor(public type: string) { }
}

export enum SignalResponses {
    SignalError = 'error',
    RoomCreated = 'room_created',
    RequestAccepted = 'request_accepted',
    GuestRequest = 'guest_request'
}