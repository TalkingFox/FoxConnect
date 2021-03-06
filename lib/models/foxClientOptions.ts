export interface FoxClientOptions {
    signalServer: string;
    onDisconnect: () => void;
    onMessageReceived: (message: string) => void;
    onMessageFailed: (error: any) => void;
}