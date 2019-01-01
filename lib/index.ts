import { FoxConnectOptions } from "./models/foxConnectOptions";
import { IotClient, ListenCallback } from "./iot/iotClient";
import { HttpUtils } from "./http";
import { AcceptGuestRequest } from "./models/acceptGuestRequest";
import { JoinRoomRequest } from "./models/joinRoomRequest";
import { HostResponse } from "./models/hostResponse";
import { JoinRoomResponse } from "./models/joinRoomResponse";

export module FoxConnect {
    export class Host {
        private iot: IotClient;

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
            return HttpUtils.delete(endpoint);
        }

        public listenForGuests(room: string, callback: ListenCallback): void {
            this.iot.subscribeAll(room, callback);
        }

        public registerGuest(request: AcceptGuestRequest): Promise<void> {
            const endpoint = `${this.options.signalServer}/rooms/${request.room}/accept`;
            return HttpUtils.post(
                endpoint,
                {
                    answer: request.answer,
                    playerId: request.guestId
                });
        }
    }

    export class InnerClient {
        private iot: IotClient;

        constructor(private options: FoxConnectOptions) {
            this.iot = new IotClient(options);
        }

        public joinRoom(request: JoinRoomRequest): Promise<HostResponse> {
            const promise = new Promise<HostResponse>((resolve, reject) => {
                const endpoint = `${this.options.signalServer}/rooms/${request.room}/join`;
                HttpUtils.post<JoinRoomResponse>(
                    endpoint,
                    {
                        player: request.player,
                        offer: request.offer
                    })
                    .then((response: JoinRoomResponse) =>
                        this.iot.subscribe(
                            response.roomTopic,
                            (response: HostResponse) => resolve(response))
                    );
            });
            return promise;
        }
    }
}