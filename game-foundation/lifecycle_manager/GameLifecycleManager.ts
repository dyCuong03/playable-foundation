import {_decorator, Component} from "cc";
import {IInitializable} from "db://assets/plugins/game-foundation/lifecycle_manager/implementions/IInitializable";
import {ITickable} from "db://assets/plugins/game-foundation/lifecycle_manager/implementions/ITickable";
import {IFixedTickable} from "db://assets/plugins/game-foundation/lifecycle_manager/implementions/IFixedTickable";
import {ILateTickable} from "db://assets/plugins/game-foundation/lifecycle_manager/implementions/ILateTickable";
import {IDisposable} from "db://assets/plugins/game-foundation/lifecycle_manager/implementions/IDisposable";
import {lifecycle_registry} from "db://assets/plugins/game-foundation/lifecycle_manager/lifecycle_decorator";

const {ccclass} = _decorator;

@ccclass("GameLifecycleManager")
export class GameLifecycleManager extends Component {
    private static instance: GameLifecycleManager;

    private initializables: Set<IInitializable> = new Set();
    private tickables: Set<ITickable> = new Set();
    private fixedTickables: Set<IFixedTickable> = new Set();
    private lateTickables: Set<ILateTickable> = new Set();
    private disposables: Set<IDisposable> = new Set();

    private autoRegisteredInstances: any[] = [];

    private fixedTimeStep: number = 0.02;
    private fixedAccumulator: number = 0;

    static get Instance(): GameLifecycleManager {
        return this.instance;
    }

    onLoad() {
        if (GameLifecycleManager.instance && GameLifecycleManager.instance !== this) {
            console.warn("Found many GameLifecycleManager instances.May destroy duplicate.");
            this.destroy();
            return;
        }
        GameLifecycleManager.instance = this;

        this.autoRegisterDecoratedClasses();
    }

    private autoRegisterDecoratedClasses(): void {
        if (lifecycle_registry.size === 0) {
            return;
        }

        lifecycle_registry.forEach(ClassConstructor => {
            try {
                const instance = new ClassConstructor();

                this.Register(instance);

                this.autoRegisteredInstances.push(instance);
            } catch (error) {
                console.error(`Failed to auto-register ${ClassConstructor.name}:`, error);
            }
        });
    }

    public Register(obj: any): void {
        if (!obj) {
            console.warn("Attempted to register null or undefined object");
            return;
        }

        let registeredCount = 0;

        if (this.isType<IInitializable>(obj, 'Initialize')) {
            this.initializables.add(obj);
            obj.Initialize();
            registeredCount++;
        }

        if (this.isType<ITickable>(obj, 'Tick')) {
            this.tickables.add(obj);
            registeredCount++;
        }

        if (this.isType<IFixedTickable>(obj, 'FixedTick')) {
            this.fixedTickables.add(obj);
            registeredCount++;
        }

        if (this.isType<ILateTickable>(obj, 'LateTick')) {
            this.lateTickables.add(obj);
            registeredCount++;
        }

        if (this.isType<IDisposable>(obj, 'Dispose')) {
            this.disposables.add(obj);
            registeredCount++;
        }

        if (registeredCount === 0) {
            console.warn(`Object ${obj.constructor?.name || 'Unknown'} Element was not implemented`);
        }
    }

    public Unregister(obj: any): void {
        if (!obj) return;

        this.initializables.delete(obj);
        this.tickables.delete(obj);
        this.fixedTickables.delete(obj);
        this.lateTickables.delete(obj);

        if (this.disposables.has(obj)) {
            (obj as IDisposable).Dispose();
            this.disposables.delete(obj);
        }
    }

    public SetFixedTimeStep(timeStep: number): void {
        this.fixedTimeStep = timeStep;
    }

    public GetFixedTimeStep(): number {
        return this.fixedTimeStep;
    }

    private isType<T>(obj: any, methodName: string): obj is T {
        return methodName in obj;
    }

    update(deltaTime: number) {
        this.tickables.forEach(tickable => {
            tickable.Tick(deltaTime);
        });

        this.fixedAccumulator += deltaTime;
        while (this.fixedAccumulator >= this.fixedTimeStep) {
            this.fixedTickables.forEach(fixedTickable => {
                fixedTickable.FixedTick(this.fixedTimeStep);
            });
            this.fixedAccumulator -= this.fixedTimeStep;
        }
    }

    lateUpdate(deltaTime: number) {
        this.lateTickables.forEach(lateTickable => {
            lateTickable.LateTick(deltaTime);
        });
    }

    onDestroy() {
        this.disposables.forEach(disposable => {
            disposable.Dispose();
        });

        this.initializables.clear();
        this.tickables.clear();
        this.fixedTickables.clear();
        this.lateTickables.clear();
        this.disposables.clear();

        this.autoRegisteredInstances = [];

        if (GameLifecycleManager.instance === this) {
            GameLifecycleManager.instance = null!;
        }
    }

    public GetDebugInfo(): string {
        return `GameLifecycleManager Stats:
  Initializables: ${this.initializables.size}
  Tickles: ${this.tickables.size}
  FixedTickles: ${this.fixedTickables.size}
  LateTickles: ${this.lateTickables.size}
  Disposables: ${this.disposables.size}
  Auto-registered: ${this.autoRegisteredInstances.length}
  FixedTimeStep: ${this.fixedTimeStep}s`;
    }
}