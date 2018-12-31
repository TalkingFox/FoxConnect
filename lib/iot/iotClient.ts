import { device } from 'aws-iot-device-sdk';
import { GuestRequest } from '../models/clientRequest';
import { HostResponse } from '../models/hostResponse';
import { IotResponse } from './iotResponse';
import { ConnectType } from "./connectType";
import { Observable, Subject } from 'rxjs';
import { FoxConnectOptions } from '../models/foxConnectOptions';

export class IotClient {
    public requests: Observable<GuestRequest>;
    public responses: Observable<HostResponse>;
    
    private device: device;
    private decoder: TextDecoder = new TextDecoder('utf-8');
    private requests$: Subject<GuestRequest>;
    private responses$: Subject<HostResponse>;

    constructor(private options: FoxConnectOptions) {
        this.requests$ = new Subject<GuestRequest>();
        this.requests = this.requests$.asObservable();
        this.responses$ = new Subject<HostResponse>();
        this.responses = this.responses$.asObservable();

        this.device = new device({
            accessKeyId: this.options.awsAccessKey,
            baseReconnectTimeMs: 250,
            clientId: this.options.clientId,
            host: this.options.awsIotHost,
            maximumReconnectTimeMs: 500,
            protocol: 'wss',
            region: this.options.awsRegion,
            secretKey: this.options.awsSecretKey
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
                data.id = topic.split('/').pop() as string;
                this.requests$.next(data as GuestRequest);
            } else if (data.type === ConnectType.Answer) {
                this.responses$.next(data as HostResponse);
            } else {
                throw new Error('Received unknown data type: ' + data.type);
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
