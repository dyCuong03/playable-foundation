/**
 * Interface for objects that need fixed-timestep updates (physics, etc.)
 */
export interface IFixedTickable {
    /**
     * Called at fixed intervals for physics and other fixed-timestep logic
     * @param fixedDeltaTime Fixed time step in seconds
     */
    FixedTick(fixedDeltaTime: number): void;
}
