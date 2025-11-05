import { _decorator, Component, Director, director } from 'cc';
import { GameLifecycleManager } from 'db://assets/plugins/game-foundation/lifecycle_manager/GameLifecycleManager';
import { IInitializable } from 'db://assets/plugins/game-foundation/lifecycle_manager/implementions/IInitializable';
import { ITickable } from 'db://assets/plugins/game-foundation/lifecycle_manager/implementions/ITickable';
import { IFixedTickable } from 'db://assets/plugins/game-foundation/lifecycle_manager/implementions/IFixedTickable';
import { ILateTickable } from 'db://assets/plugins/game-foundation/lifecycle_manager/implementions/ILateTickable';
import { IDisposable } from 'db://assets/plugins/game-foundation/lifecycle_manager/implementions/IDisposable';

const { ccclass } = _decorator;

/**
 * Base component that integrates with the GameLifecycleManager lifecycle hooks.
 * Derive from this class and override the protected handlers as needed:
 *  - onInitialize
 *  - onTick
 *  - onFixedTick
 *  - onLateTick
 *  - onDispose
 */
@ccclass('lifecycle_component')
export abstract class LifecycleComponent extends Component
    implements IInitializable, ITickable, IFixedTickable, ILateTickable, IDisposable {
    private registered = false;
    private waitingForManager = false;

    protected onLoad(): void {
        this.tryRegisterWithManager();
    }

    protected onEnable(): void {
        this.tryRegisterWithManager();
    }

    protected onDisable(): void {
        this.unregisterFromManager();
    }

    protected onDestroy(): void {
        this.unregisterFromManager();
    }

    Initialize(): void {
        this.onInitialize();
    }

    Tick(deltaTime: number): void {
        this.onTick(deltaTime);
    }

    FixedTick(fixedDeltaTime: number): void {
        this.onFixedTick(fixedDeltaTime);
    }

    LateTick(deltaTime: number): void {
        this.onLateTick(deltaTime);
    }

    Dispose(): void {
        if (!this.registered) {
            return;
        }

        this.registered = false;
        this.onDispose();
    }

    protected onInitialize(): void {
        // Override in subclasses
    }

    protected onTick(_deltaTime: number): void {
        // Override in subclasses
    }

    protected onFixedTick(_fixedDeltaTime: number): void {
        // Override in subclasses
    }

    protected onLateTick(_deltaTime: number): void {
        // Override in subclasses
    }

    protected onDispose(): void {
        // Override in subclasses
    }

    private tryRegisterWithManager(): void {
        if (this.registered || !this.isActiveAndEnabled()) {
            return;
        }

        const manager = this.resolveManager();
        if (manager) {
            manager.Register(this);
            this.registered = true;
            this.waitingForManager = false;
            return;
        }

        if (!this.waitingForManager) {
            this.waitingForManager = true;
            director.once(Director.EVENT_AFTER_SCENE_LAUNCH, this.handleSceneLaunched, this);
            // Fallback in case the scene event already fired but manager appears later.
            this.scheduleOnce(() => this.tryRegisterWithManager(), 0);
        }
    }

    private resolveManager(): GameLifecycleManager | null {
        const instance = GameLifecycleManager.Instance;
        if (instance) {
            return instance;
        }

        const scene = this.node?.scene;
        if (scene) {
            const manager = scene.getComponentInChildren(GameLifecycleManager);
            if (manager) {
                return manager;
            }
        }

        return null;
    }

    private handleSceneLaunched(): void {
        this.waitingForManager = false;
        this.tryRegisterWithManager();
    }

    private unregisterFromManager(): void {
        if (!this.registered) {
            return;
        }

        const manager = this.resolveManager();
        if (manager) {
            manager.Unregister(this);
        }

        this.registered = false;
    }

    private isActiveAndEnabled(): boolean {
        return this.enabledInHierarchy && this.node?.activeInHierarchy === true;
    }
}
