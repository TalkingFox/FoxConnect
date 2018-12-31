export interface IotResponse  {
    type: ConnectType;
    id: string;
}

export enum ConnectType {
    Answer = 'answer',
    Offer = 'offer'
}
