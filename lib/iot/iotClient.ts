import { device } from 'aws-iot-device-sdk';
import { GuestRequest } from '../models/clientRequest';
import { HostResponse } from '../models/hostResponse';
import { IotResponse } from './iotResponse';
import { ConnectType } from "./connectType";
import { FoxConnectOptions } from '../models/foxConnectOptions';

export type ListenCallback = (request: GuestRequest) => void;
export type JoinCallback = (request: HostResponse) => void;

export class IotClient {
    private requests: ListenCallback = () => {};
    public responses: JoinCallback = () => {};
    
    private device: device;
    private decoder: TextDecoder = new TextDecoder('utf-8');
    private subscriptions: string[] = [];

    constructor(private options: FoxConnectOptions) {
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

    public subscribe(topic: string, callback: JoinCallback): void {
        this.responses = callback;
        this.device.subscribe(topic);
        this.subscriptions.push(topic);
    }

    public subscribeAll(room: string, callback: ListenCallback): void {
        this.requests = callback;
        const topic = 'rooms/' + room + '/#';
        this.device.subscribe(topic);
        this.subscriptions.push(topic);
    }

    public unsubscribe(): void {
        this.subscriptions.forEach((topic: string) => {
            this.device.unsubscribe(topic);
        });
    }

    private attachEvents(): void {
        this.device.on('message', (topic: string, payload: Uint8Array) => {
            const message = this.decoder.decode(payload);
            const data = JSON.parse(message) as IotResponse;
            if (data.type === ConnectType.Offer) {
                data.id = topic.split('/').pop() as string;
                this.requests(data as GuestRequest);
            } else if (data.type === ConnectType.Answer) {
                this.responses(data as HostResponse);
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
