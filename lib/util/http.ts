export class HttpUtils {
    public static post<T>(endpoint: string, body: any): Promise<T> {
        return this.send({
            body: body,
            method: 'POST',
            url: endpoint
        });
    }

    public static delete<T>(endpoint: string, body?: any): Promise<T> {
        return this.send({
            body: body,
            method: 'DELETE',
            url: endpoint
        });
    }

    private static send<T>(request: HttpRequest<any>): Promise<T> {
        const promise = new Promise<T>((resolve, reject) => {
            const http = new XMLHttpRequest();
            http.open(request.method, request.url, true);
            http.setRequestHeader('Content-Type', 'application/json');
            http.send(JSON.stringify(request.body));

            http.onreadystatechange = function () {
                if (this.readyState === XMLHttpRequest.DONE) {
                    resolve(JSON.parse(this.responseText));
                }
                if (this.status > 399) {
                    reject(this.statusText);
                }
            }
        });
        return promise;
    }
}

export interface HttpRequest<T> {
    method: string
    url: string;
    body: T;
}