import { Observable, throwError } from 'rxjs';
import { ajax, AjaxError, AjaxResponse } from 'rxjs/ajax';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { IotClient } from './iot/iotClient';
import { FoxConnectOptions } from './foxConnectOptions';
import { GuestRequest } from './iot/clientRequest';
import { AcceptGuestRequest } from './iot/iotRequest';
import { HostResponse } from './iot/hostResponse';
import { JoinRoomResponse } from './iot/joinRoomResponse';
import { JoinRoomRequest } from './models/joinRoomRequest';

export class RoomService {
    private iot: IotClient;    

    constructor(private options: FoxConnectOptions) {
        this.iot = new IotClient(`In-Control-Host-${Math.floor(Math.random() * 1000000 + 1)}`);
    }

    public createRoom(): Observable<string> {
        const endpoint = this.options.signalServer + '/rooms';
        const headers = this.getHeaders();
        return ajax
            .post(
                endpoint,
                {
                    host: this.iot.clientId
                },
                headers
            )
            .pipe(
                map((response: AjaxResponse) => {
                    return response.response;
                })
            );
    }

    public freeRoom(room: string): void {
        const endpoint = `${this.options.signalServer}/rooms/${room}`;
        const headers = this.getHeaders();
        ajax.delete(endpoint, headers).subscribe();
    }

    public readGuestBook(room: string): Observable<GuestRequest> {
        this.iot.subscribeAll(room);
        return this.iot.requests;
    }

    public registerGuest(request: AcceptGuestRequest): void {
        const endpoint = `${this.options.signalServer}/rooms/${
            request.room
        }/accept`;
        const headers = this.getHeaders();
        ajax.post(
            endpoint,
            {
                answer: request.answer,
                playerId: request.guestId
            },
            headers
        ).subscribe();
    }

    public bookRoom(request: JoinRoomRequest): Observable<HostResponse> {
        const endpoint = `${this.options.signalServer}/rooms/${
            request.room
        }/join`;
        const headers = this.getHeaders();
        return ajax
            .post(
                endpoint,
                {
                    player: request.player,
                    offer: request.offer
                },
                headers
            )
            .pipe(
                mergeMap((response: AjaxResponse) => {
                    const joinResponse = response.response as JoinRoomResponse;
                    this.iot.subscribe(joinResponse.roomTopic);
                    return this.iot.responses;
                }),
                catchError((error: AjaxError) => {
                    return throwError(error.response.message);
                })
            );
    }

    private getHeaders(): object {
        return {
            'Content-Type': 'application/json'
        };
    }
}
