export class ManagedPromise<T> {
    private innerPromise: Promise<T>;
    private innerResolve: (value?: T | PromiseLike<T>) => void;
    private innerReject: (reason?: any) => void;
    
    constructor() {
        this.innerPromise = new Promise<T>((resolve, reject) => {
            this.innerResolve = resolve;
            this.innerReject = reject;
        });
    }

    public resolve(value?: T): void {
        this.innerResolve(value);
    }

    public reject(reason?: any): void {
        this.innerReject(reason);
    }

    public get promise(): Promise<T> {
        return this.innerPromise;
    }
}