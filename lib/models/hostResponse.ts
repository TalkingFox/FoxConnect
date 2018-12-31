import { IotResponse } from '../iot/iotResponse';

export interface HostResponse extends IotResponse {
    answer: string;
}
