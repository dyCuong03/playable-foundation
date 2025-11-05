/**
 * Interface for objects that need a start callback after initialization.
 */
export interface IStartable {
    /**
     * Called once when the lifecycle manager enters its start phase.
     */
    Start(): void;
}
