/**
 * signal_bus - Simple event bus with type checking
 */
export class signal_bus {
    private subscriptions = new Map<any, Array<(data: any) => void>>();
    private static _instance: signal_bus | null = null;

    /**
     * Get singleton instance
     */
    public static get instance(): signal_bus {
        if (!this._instance) {
            this._instance = new signal_bus();
        }
        return this._instance;
    }

    /**
     * Subscribe to a signal using constructor
     * @param signalType Constructor of the signal class
     * @param callback Callback function with typed data
     */
    public subscribe<T>(signalType: new (...args: any[]) => T, callback: (data: T) => void): void {
        if (!this.subscriptions.has(signalType)) {
            this.subscriptions.set(signalType, []);
        }

        const callbacks = this.subscriptions.get(signalType)!;

        // Prevent duplicate subscriptions
        if (callbacks.indexOf(callback) === -1) {
            callbacks.push(callback);
        }
    }

    /**
     * Unsubscribe from a signal
     * @param signalType Constructor of the signal class
     * @param callback Callback to remove
     */
    public unsubscribe<T>(signalType: new (...args: any[]) => T, callback: (data: T) => void): void {
        const callbacks = this.subscriptions.get(signalType);
        if (!callbacks) return;

        const index = callbacks.indexOf(callback);
        if (index !== -1) {
            callbacks.splice(index, 1);
        }

        // Clean up empty subscription lists
        if (callbacks.length === 0) {
            this.subscriptions.delete(signalType);
        }
    }

    /**
     * Fire a signal with data
     * @param data Instance of the signal class
     */
    public fire<T>(data: T): void {
        const signalType = (data as any).constructor;
        const callbacks = this.subscriptions.get(signalType);

        if (!callbacks) return;

        // Create a copy to avoid issues if callbacks modify subscriptions
        const callbacksCopy = [...callbacks];

        for (const callback of callbacksCopy) {
            try {
                callback(data);
            } catch (error) {
                console.error(`[signal_bus] Error in callback for ${signalType.name}:`, error);
            }
        }
    }

    /**
     * Clear all subscriptions for a signal type
     * @param signalType Constructor of the signal class
     */
    public clear<T>(signalType: new (...args: any[]) => T): void {
        this.subscriptions.delete(signalType);
    }

    /**
     * Clear all subscriptions
     */
    public clearAll(): void {
        this.subscriptions.clear();
    }

    /**
     * Check if there are any subscriptions for a signal type
     * @param signalType Constructor of the signal class
     */
    public hasSubscriptions<T>(signalType: new (...args: any[]) => T): boolean {
        const callbacks = this.subscriptions.get(signalType);
        return callbacks ? callbacks.length > 0 : false;
    }
}