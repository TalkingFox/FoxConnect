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
import { JoinRoomResponse } from "./models/joinRoomResponse";
import { SignalError } from "./models/signalError";
import { FoxClientOptions } from "./models/foxClientOptions";
import { FoxHostOptions } from "./models/foxHostOptions";


export class Host {
    private socket: Socket;
    private connections: Map<string, Instance> = new Map<string, Instance>();
    private signalServer: string;
    private decoder: TextDecoder;

    private roomCreated: ManagedPromise<string>;

    constructor(private options: FoxHostOptions) {
        this.signalServer = this.options.signalServer;
        this.decoder = new TextDecoder('utf-8');
        this.roomCreated = new ManagedPromise();
    }

    public createRoom(): Promise<string> {
        this.socket = new Socket(this.signalServer);
        this.registerEvents();
        this.socket.on('connect', () => {
            const request = new CreateRoomRequest();
            this.socket.send(JSON.stringify(request));
        });
        
        return this.roomCreated.promise;
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
                case SignalResponses.RequestAccepted:
                    break;
                default:
                    throw 'Unknown event received: ' + JSON.stringify(decoded);
            }
        });
    }

    public closeRoom(): void {
        this.socket.destroy();
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
            this.options.onGuestJoined(request.client);
            newPeer.on('data', (data: BufferSource) => {
                const decoded: string = this.decoder.decode(data);
                this.options.onMessageReceived(request.client, decoded);
            });
        });

        newPeer.on('close', () => {
            this.connections.delete(request.client);
            this.options.onClientDisconnected(request.client);
        })
    }

    public sendToAll<T>(message: T): void {
        this.connections.forEach((peer: Instance) => {
            peer.send(JSON.stringify(message));
        });
    }

    public sendTo<T>(clientId: string, message: T): void {
        if (!this.connections.has(clientId)) {
            throw Error('Cannot send message to unregisted client: ' + clientId);
        }
        const peer: Instance = this.connections.get(clientId) as Instance;
        peer.send(JSON.stringify(message));
    }
}


export class Client {
    private peer: Instance;
    private socket: Socket;
    private roomJoined: ManagedPromise<string>;
    private decoder = new TextDecoder('utf-8');

    constructor(private options: FoxClientOptions) {
        this.socket = new Socket(options.signalServer);
        this.roomJoined = new ManagedPromise();
        this.registerEvents();
    }

    private registerEvents(): void {
        this.socket.on('data', (data: BufferSource) => {
            const decoded: SignalResponse = JSON.parse(this.decoder.decode(data));;
            switch(decoded.type) {
                case SignalResponses.RoomJoined:
                    this.roomJoined.resolve((<JoinRoomResponse>decoded).answer);
                    break;
                case SignalResponses.RequestAccepted:
                    break;
                case SignalResponses.RoomError:
                    this.roomJoined.reject((<SignalError>decoded).error);
                    break;
                default:
                    throw 'Unknown event received: ' + JSON.stringify(decoded);
            }
        });
    }

    public leaveRoom(): void {
        this.peer.destroy();
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

        const promise = TimedPromise<void>(30 * 1000, (resolve, reject) => {
            this.peer.on('connect', () => {
                console.log('connected');
                this.peer.on('data', this.options.onMessageReceived);
                resolve();
            });

            this.peer.on('close', () => {
                this.options.onDisconnect();
            });

            this.roomJoined.promise.catch((reason: string) => {
                reject(reason);
            });
        });
        
        return promise;
    }

    public send<T>(message: T): void {
        this.peer.send(JSON.stringify(message));
    }
}