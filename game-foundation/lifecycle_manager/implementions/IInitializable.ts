/**
 * Interface for objects that need initialization
 */
export interface IInitializable {
    /**
     * Called once when the object is initialized
     */
    Initialize(): void;
}
