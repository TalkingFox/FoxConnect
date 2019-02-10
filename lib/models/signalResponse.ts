export abstract class SignalResponse {
    constructor(public type: string) { }
}

export enum SignalResponses {
    RoomCreated = 'room_created',
    RequestAccepted = 'request_accepted',
    RoomError = 'room_error',
    GuestRequest = 'guest_request',
    RoomJoined = 'room_joined'
}