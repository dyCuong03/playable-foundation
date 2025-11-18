export abstract class Singleton<T> {
    private static _instance: any;

    public static get instance(): any {
        if (!this._instance) {
            this._instance = new (this as any)();
        }
        return this._instance;
    }

    protected constructor() {
        const cls = this.constructor as typeof Singleton;
        if (cls._instance) {
            throw new Error(`${cls.name} is a singleton class and cannot be instantiated multiple times.`);
        }
        cls._instance = this;
    }
}
