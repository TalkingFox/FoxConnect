export type PromiseCallback<T> = (resolve: (value?: T | PromiseLike<T>) => void, 
                                  reject: (reason? : any) => void ) => void;

export function TimedPromise<T>(timeoutInMs: number, callback: PromiseCallback<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        callback(resolve, reject);
        setTimeout(() => {reject('Promise timed out.')}, timeoutInMs);
    });
}