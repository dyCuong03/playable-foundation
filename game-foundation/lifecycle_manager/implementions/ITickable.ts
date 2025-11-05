/**
 * Interface for objects that need to be updated every frame
 */
export interface ITickable {
    /**
     * Called every frame
     * @param deltaTime Time elapsed since last frame in seconds
     */
    Tick(deltaTime: number): void;
}
