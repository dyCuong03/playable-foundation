export type {IInitializable} from "./implementions/IInitializable";
export type {ITickable} from "./implementions/ITickable";
export type {IFixedTickable} from "./implementions/IFixedTickable";
export type {ILateTickable} from "./implementions/ILateTickable";
export type {IDisposable} from "./implementions/IDisposable";

export { GameLifecycleManager } from "./GameLifecycleManager";

export { register_lifecycle, lifecycle_registry } from "./lifecycle_decorator";
export { LifecycleComponent } from "./base/lifecycle_component";
