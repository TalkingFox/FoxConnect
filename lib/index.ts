import { FoxConnectOptions } from "./models/foxConnectOptions";
import { IotClient, ListenCallback } from "./iot/iotClient";
import { HttpUtils } from "./util/http";
import { AcceptGuestRequest } from "./models/acceptGuestRequest";
import { JoinRoomRequest } from "./models/joinRoomRequest";
import { HostResponse } from "./models/hostResponse";
import { JoinRoomResponse } from "./models/joinRoomResponse";
import Peer, { Instance } from 'simple-peer';
import { TimedPromise } from "./util/timedPromise";
import { GuestRequest } from "./models/clientRequest";

export type GuestCallback = (guestName: string) => void;

export class Host {
    private iot: IotClient;
    private connections: Map<string, Instance> = new Map<string, Instance>();
    private onMessageReceived: MessageReceivedCallback;

    constructor(private options: FoxConnectOptions) {
        this.iot = new IotClient(options);
    }

    public createRoom(): Promise<string> {
        const endpoint = this.options.signalServer + '/rooms';
        return HttpUtils.post<string>(
            endpoint,
            {
                host: this.options.clientId
            });
    }

    public freeRoom(room: string): Promise<void> {
        const endpoint = `${this.options.signalServer}/rooms/${room}`;
        this.iot.unsubscribe();
        return HttpUtils.delete(endpoint);
    }

    public listenForGuests(room: string, guestJoinedCallback: GuestCallback): void {
        this.iot.subscribeAll(room, (request: GuestRequest) => {
            const newPeer = new Peer({
                initiator: false,
                trickle: false
            });
            newPeer.signal(request.offer);
            newPeer.on('signal', (id: any) => {
                const response: AcceptGuestRequest = {
                    answer: id,
                    guestId: request.id,
                    room: request.room
                };
                this.registerGuest(response);
            })
            newPeer.on('connect', () => {
                this.connections.set(request.name, newPeer);
                guestJoinedCallback(request.name);
                newPeer.on('data', this.onMessageReceived);
            });
        });
    }

    public listenForMessages(callback: MessageReceivedCallback): void {
        this.onMessageReceived = callback;
    }

    private registerGuest(request: AcceptGuestRequest): Promise<void> {
        const endpoint = `${this.options.signalServer}/rooms/${request.room}/accept`;
        return HttpUtils.post(
            endpoint,
            {
                answer: request.answer,
                playerId: request.guestId
            });
    }
}

export type MessageReceivedCallback = (message: string) => void;

export class Client {
    private iot: IotClient;
    private peer: Instance;
    private onMessageReceived: MessageReceivedCallback;

    constructor(private options: FoxConnectOptions) {
        this.iot = new IotClient(options);
    }

    public listenForMessages(messageCallback: MessageReceivedCallback): void {
        this.onMessageReceived = messageCallback;
    }

    public joinRoom(room: string, playerName: string = Math.floor(Math.random() * 1000000 + 1).toString()): Promise<void> {
        this.peer = new Peer({ initiator: true, trickle: false });
        this.peer.on('signal', (id: any) => {
            const request: JoinRoomRequest = {
                offer: JSON.stringify(id),
                player: playerName,
                room: room
            };
            const endpoint = `${this.options.signalServer}/rooms/${room}/join`;
            HttpUtils.post<JoinRoomResponse>(
                endpoint,
                {
                    player: request.player,
                    offer: request.offer
                })
                .then((response: JoinRoomResponse) =>
                    this.iot.subscribe(
                        response.roomTopic,
                        (response: HostResponse) => {
                            this.peer.signal(response.answer);
                        })
                );
        });

        const promise = TimedPromise<void>(30 * 1000, (resolve, reject) => {
            this.peer.on('connect', () => {
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