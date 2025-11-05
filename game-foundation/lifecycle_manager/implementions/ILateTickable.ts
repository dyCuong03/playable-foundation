/**
 * Interface for objects that need to be updated after all regular updates
 * Useful for camera follow, final position adjustments, etc.
 */
export interface ILateTickable {
    /**
     * Called after all Tick updates have been processed
     * @param deltaTime Time elapsed since last frame in seconds
     */
    LateTick(deltaTime: number): void;
}
