/**
 * Interface for objects that need cleanup on destruction
 */
export interface IDisposable {
    /**
     * Called when the object is being destroyed
     * Clean up resources, remove event listeners, etc.
     */
    Dispose(): void;
}
