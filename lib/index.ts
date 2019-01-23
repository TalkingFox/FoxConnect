import { FoxConnectOptions } from "./models/foxConnectOptions";
import { AddToRoomRequest } from "./models/addToRoomRequest";
import { JoinRoomRequest } from "./models/joinRoomRequest";
import Peer, { Instance } from 'simple-peer';
import Socket from 'simple-websocket';
import { TimedPromise } from "./util/timedPromise";
import { CreateRoomRequest } from "./models/createRoomRequest";
import { SignalResponse, SignalResponses } from "./models/signalResponse";
import { RoomCreatedResponse } from "./models/roomCreatedResponse";
import { GuestRequest } from "./models/guestRequest";
import { ManagedPromise } from "./util/managedPromise";

export type GuestCallback = (guestName: string) => void;

export class Host {
    private socket: Socket;
    private connections: Map<string, Instance> = new Map<string, Instance>();
    private onMessageReceived: MessageReceivedCallback;
    private signalServer: string;
    private decoder: TextDecoder;
    private guestJoinedCallback: GuestCallback;

    private roomCreated: ManagedPromise<string>;

    constructor(options: FoxConnectOptions) {
        this.signalServer = options.signalServer;
        this.decoder = new TextDecoder('utf-8');
        this.roomCreated = new ManagedPromise();
    }

    public connect(): Promise<void> {
        const promise = TimedPromise<void>(30 * 1000, (resolve, reject) => {
            this.socket = new Socket(this.signalServer);
            this.registerEvents();
            this.socket.on('connect', () => {
                resolve();
            });
        });
        return promise;
    }

    private registerEvents(): void {
        this.socket.on('data', (data: BufferSource) => {
            const decoded: SignalResponse = JSON.parse(this.decoder.decode(data));;
            switch(decoded.type) {
                case SignalResponses.RoomCreated:
                    this.roomCreated.resolve((<RoomCreatedResponse>decoded).room);
                    break;
                case SignalResponses.GuestRequest:
                    this.registerGuest(<GuestRequest>decoded);
                    break;
                default:
                    throw 'Unknown event received: ' + JSON.stringify(decoded);
            }
        });
    }

    public createRoom(): Promise<string> {
        const request = new CreateRoomRequest();
        this.socket.send(JSON.stringify(request));
        return this.roomCreated.promise;
    }

    public closeRoom(): void {
        this.socket.destroy();
    }

    public listenForGuests(guestJoinedCallback: GuestCallback): void {
        this.guestJoinedCallback = guestJoinedCallback;
    }

    private registerGuest(request: GuestRequest): void {
        const newPeer = new Peer({
            initiator: false,
            trickle: false
        });
        newPeer.signal(request.offer);
        newPeer.on('signal', (id: any) => {
            const response = new AddToRoomRequest({
                answer: id,
                client: request.client
            });
            this.socket.send(JSON.stringify(response));
        })
        newPeer.on('connect', () => {
            this.connections.set(request.client, newPeer);
            this.guestJoinedCallback(request.client);
            newPeer.on('data', this.onMessageReceived);
        });
    }

    public listenForMessages(callback: MessageReceivedCallback): void {
        this.onMessageReceived = callback;
    }
}

export type MessageReceivedCallback = (message: string) => void;

export class Client {
    private peer: Instance;
    private onMessageReceived: MessageReceivedCallback;
    private socket: Socket;
    private roomJoined: ManagedPromise<string>;

    constructor(options: FoxConnectOptions) {
        this.socket = new Socket(options.signalServer);
        this.roomJoined = new ManagedPromise();
    }

    public listenForMessages(messageCallback: MessageReceivedCallback): void {
        this.onMessageReceived = messageCallback;
    }

    public joinRoom(room: string): Promise<void> {
        this.peer = new Peer({ initiator: true, trickle: false });
        this.peer.on('signal', (id: any) => {
            const request = new JoinRoomRequest({
                offer: JSON.stringify(id),
                room: room
            });
            this.socket.send(JSON.stringify(request));
        });

        this.roomJoined.promise
            .then((answer: string) => {
                this.peer.signal(answer);
            });

        const promise = TimedPromise<void>(30 * 1000, (resolve) => {
            this.peer.on('connect', () => {
                console.log('connected');
                this.peer.on('data', this.onMessageReceived);
                resolve();
            });
        });
        return promise;
    }

    public send<T>(message: T): void {
        this.peer.send(JSON.stringify(message));
    }
}