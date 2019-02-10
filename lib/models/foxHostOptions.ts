export interface FoxHostOptions {
    signalServer: string;
    onGuestJoined: (clientId: string) => void;
    onClientDisconnected: (clientId: string) => void;
    onMessageReceived: (clientId: string, message: string) => void;
}