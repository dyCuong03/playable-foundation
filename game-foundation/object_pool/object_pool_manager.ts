import { Node, Prefab, instantiate, Vec3, Quat, director } from "cc";
import {assets_manager} from "db://assets/plugins/game-foundation/assets_manager";

interface IObjectPool {
    prefab: Prefab | Node;
    pooled_objects: Node[];
    spawned_objects: Set<Node>;
    container: Node;
}

export class object_pool_manager {
    private static _instance: object_pool_manager = new object_pool_manager();
    private _pools: Map<string, IObjectPool> = new Map();
    private _pool_container: Node | null = null;
    private _pool_categories: Map<string, Node> = new Map();

    public static get instance(): object_pool_manager {
        return this._instance;
    }

    private ensurePoolContainer(): Node {
        if (!this._pool_container || !this._pool_container.isValid) {
            this._pool_container = new Node("ObjectPools");
            const scene = director.getScene();
            if (scene) {
                this._pool_container.parent = scene;
            }
        }
        return this._pool_container;
    }

    private getOrCreateCategoryContainer(key: string): Node {
        const poolContainer = this.ensurePoolContainer();

        // Extract category from key (e.g., "Enemies/Goblin" -> "Enemies")
        const category = key.includes('/') ? key.split('/')[0] : 'Default';

        let categoryContainer = this._pool_categories.get(category);
        if (!categoryContainer || !categoryContainer.isValid) {
            categoryContainer = new Node(`Pool_${category}`);
            categoryContainer.parent = poolContainer;
            this._pool_categories.set(category, categoryContainer);
        }

        return categoryContainer;
    }

    public Load(prefab: Prefab | Node, count?: number): void;
    public Load(key: string, count?: number): void;
    public Load(key: string, prefab: Prefab | Node, count?: number): void;
    public Load(arg1: Prefab | Node | string, arg2?: Prefab | Node | number, arg3?: number): void {
        let key: string;
        let prefab: Prefab | Node | undefined;
        let count: number;

        if (typeof arg1 === 'string') {
            key = arg1;
            if (arg2 instanceof Prefab || arg2 instanceof Node) {
                prefab = arg2;
                count = arg3 || 10;
            } else {
                prefab = undefined;
                count = (arg2 as number) || 10;
            }
        } else {
            prefab = arg1;
            key = prefab.name;
            count = (arg2 as number) || 10;
        }

        if (!prefab) {
            this.LoadFromResources(key, count);
            return;
        }

        if (this._pools.has(key)) {
            const pool = this._pools.get(key)!;
            for (let i = 0; i < count; i++) {
                const node = this.createNode(prefab);
                node.active = false;
                node.parent = pool.container;
                pool.pooled_objects.push(node);
            }
            return;
        }

        const container = this.getOrCreateCategoryContainer(key);
        const poolContainer = new Node(`${key.split('/').pop() || key}_Pool`);
        poolContainer.parent = container;

        const pooled_objects: Node[] = [];
        const spawned_objects = new Set<Node>();

        for (let i = 0; i < count; i++) {
            const node = this.createNode(prefab);
            node.active = false;
            node.parent = poolContainer;
            pooled_objects.push(node);
        }

        this._pools.set(key, {
            prefab,
            pooled_objects,
            spawned_objects,
            container: poolContainer
        });
    }

    public Spawn(prefab: Prefab | Node, position?: Vec3, rotation?: Quat, parent?: Node): Node | null;
    public Spawn(key: string, position?: Vec3, rotation?: Quat, parent?: Node): Node | null;
    public Spawn(arg1: Prefab | Node | string, position?: Vec3, rotation?: Quat, parent?: Node): Node | null {
        let key: string;
        let pool: IObjectPool | undefined;

        if (typeof arg1 === 'string') {
            key = arg1;
            pool = this._pools.get(key);
            if (!pool) {
                // Try to load from resources if pool doesn't exist
                console.warn(`Pool "${key}" does not exist. Please load it first using LoadAsync or Load.`);
                return null;
            }
        } else {
            key = arg1.name;
            pool = this._pools.get(key);
            if (!pool) {
                this.Load(arg1, 5);
                pool = this._pools.get(key)!;
            }
        }

        let node: Node | null = null;

        if (pool.pooled_objects.length > 0) {
            node = pool.pooled_objects.pop()!;
        } else {
            node = this.createNode(pool.prefab);
        }

        if (node) {
            node.active = true;
            pool.spawned_objects.add(node);

            if (parent) {
                node.parent = parent;
            }

            if (position) {
                node.setPosition(position);
            }

            if (rotation) {
                node.setRotation(rotation);
            }
        }

        return node;
    }

    public Recycle(node: Node): void;
    public Recycle(key: string, node: Node): void;
    public Recycle(arg1: Node | string, arg2?: Node): void {
        let node: Node;
        let key: string | null = null;

        if (typeof arg1 === 'string') {
            key = arg1;
            node = arg2!;
        } else {
            node = arg1;
        }

        let pool: IObjectPool | undefined;

        if (key) {
            pool = this._pools.get(key);
        } else {
            for (const [poolKey, poolInfo] of this._pools) {
                if (poolInfo.spawned_objects.has(node)) {
                    pool = poolInfo;
                    break;
                }
            }
        }

        if (!pool) {
            console.warn(`Node does not belong to any pool, destroying it`);
            node.destroy();
            return;
        }

        pool.spawned_objects.delete(node);
        node.active = false;

        this.resetNode(node);

        node.parent = pool.container;
        pool.pooled_objects.push(node);
    }

    public RecycleAll(key: string): void;
    public RecycleAll(prefab: Prefab | Node): void;
    public RecycleAll(arg: string | Prefab | Node): void {
        const key = typeof arg === 'string' ? arg : arg.name;
        const pool = this._pools.get(key);

        if (!pool) {
            console.error(`Pool "${key}" does not exist`);
            return;
        }

        const nodesToRecycle = Array.from(pool.spawned_objects);
        nodesToRecycle.forEach(node => this.Recycle(node));
    }

    public Cleanup(key: string, retainCount?: number): void;
    public Cleanup(prefab: Prefab | Node, retainCount?: number): void;
    public Cleanup(arg: string | Prefab | Node, retainCount: number = 1): void {
        const key = typeof arg === 'string' ? arg : arg.name;
        const pool = this._pools.get(key);

        if (!pool) {
            console.error(`Pool "${key}" does not exist`);
            return;
        }

        while (pool.pooled_objects.length > retainCount) {
            const node = pool.pooled_objects.pop();
            if (node) {
                node.destroy();
            }
        }
    }

    public Unload(key: string): void;
    public Unload(prefab: Prefab | Node): void;
    public Unload(arg: string | Prefab | Node): void {
        const key = typeof arg === 'string' ? arg : arg.name;
        const pool = this._pools.get(key);

        if (!pool) {
            console.error(`Pool "${key}" does not exist`);
            return;
        }

        pool.spawned_objects.forEach(node => node.destroy());
        pool.pooled_objects.forEach(node => node.destroy());

        if (pool.container && pool.container.isValid) {
            pool.container.destroy();
        }

        this._pools.delete(key);
    }

    public UnloadAll(): void {
        this._pools.forEach((_, key) => this.Unload(key));
        this._pool_categories.clear();
    }

    public GetPoolInfo(key: string): { available: number; active: number; total: number } | null {
        const pool = this._pools.get(key);
        if (!pool) {
            return null;
        }

        return {
            available: pool.pooled_objects.length,
            active: pool.spawned_objects.size,
            total: pool.pooled_objects.length + pool.spawned_objects.size
        };
    }

    public HasPool(key: string): boolean {
        return this._pools.has(key);
    }

    public GetAllPoolKeys(): string[] {
        return Array.from(this._pools.keys());
    }

    /**
     * Load prefab from resources using AssetsManager
     */
    private async LoadFromResources(key: string, count: number = 10): Promise<void> {
        // Try different resource paths
        const paths = [
            key,  // Direct path
            key.replace(/^Effects\//, ''),  // Remove Effects/ prefix
            `prefab/${key.replace(/^Effects\//, '')}`,  // Add prefab/ prefix
            `prefabs/${key.replace(/^Effects\//, '')}`,  // Add prefabs/ prefix
        ];

        for (const path of paths) {
            try {
                const prefab = await assets_manager.instance.loadPrefab(path);
                if (prefab) {
                    console.log(`Loaded prefab from resources: ${path}`);
                    this.Load(key, prefab, count);
                    return;
                }
            } catch (err) {
                // Try next path
            }
        }

        console.warn(`Could not find prefab in resources for key: ${key}`);
    }

    private createNode(prefab: Prefab | Node): Node {
        if (prefab instanceof Prefab) {
            return instantiate(prefab);
        } else {
            return instantiate(prefab);
        }
    }

    private resetNode(node: Node): void {
        node.setPosition(0, 0, 0);
        node.setRotationFromEuler(0, 0, 0);
        node.setScale(1, 1, 1);

        const components = node.components;
        components.forEach(comp => {
            if (comp && 'Reset' in comp && typeof comp['Reset'] === 'function') {
                (comp as any).Reset();
            }
        });
    }

    public Destroy(): void {
        this.UnloadAll();
        if (this._pool_container && this._pool_container.isValid) {
            this._pool_container.destroy();
        }
        this._pool_container = null;
        this._pool_categories.clear();
    }
}