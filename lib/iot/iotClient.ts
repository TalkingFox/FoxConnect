import { device } from 'aws-iot-device-sdk';
import { GuestRequest } from './clientRequest';
import { HostResponse } from './hostResponse';
import { ConnectType, IotResponse } from './iotResponse';
import { Observable, Subject } from 'rxjs';

export class IotClient {
    public requests: Observable<GuestRequest>;
    public responses: Observable<HostResponse>;
    private device: device;
    private decoder: TextDecoder = new TextDecoder('utf-8');

    private requests$: Subject<GuestRequest>;

    private responses$: Subject<HostResponse>;

    constructor(public clientId: string = `${Math.floor(Math.random() * 1000000 + 1)}`) {
        this.requests$ = new Subject<GuestRequest>();
        this.requests = this.requests$.asObservable();
        this.responses$ = new Subject<HostResponse>();
        this.responses = this.responses$.asObservable();

        this.device = new device({
            accessKeyId: environment.accessKey,
            baseReconnectTimeMs: 250,
            clientId: this.clientId,
            host: environment.iotHost,
            maximumReconnectTimeMs: 500,
            protocol: 'wss',
            region: environment.region,
            secretKey: environment.secretKey
        });
        this.attachEvents();
    }

    public subscribe(topic: string): void {
        this.device.subscribe(topic);
    }

    public subscribeAll(room: string): void {
        this.device.subscribe('rooms/' + room + '/#');
    }

    private attachEvents(): void {
        this.device.on('message', (topic: string, payload: Uint8Array) => {
            const message = this.decoder.decode(payload);
            const data = JSON.parse(message) as IotResponse;
            if (data.type === ConnectType.Offer) {
                data.id = topic.split('/').pop();
                this.requests$.next(data as GuestRequest);
            } else if (data.type === ConnectType.Answer) {
                this.responses$.next(data as HostResponse);
            } else {
                throw new Error('received unknown data type: ' + data.type);
            }
        });

        this.device.on('offline', () => {
            throw new Error('offline');
        });

        this.device.on('error', (err) => {
            throw err;
        });
    }
}
