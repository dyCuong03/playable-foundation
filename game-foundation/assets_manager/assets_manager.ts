import { Asset, AudioClip, AssetManager, Constructor, JsonAsset, Prefab, SpriteFrame, Texture2D, assetManager, resources } from "cc";

export class assets_manager {
    private static _instance: assets_manager = new assets_manager();
    private _cache: Map<string, Asset> = new Map();
    private _loading_promises: Map<string, Promise<Asset>> = new Map();

    public static get instance(): assets_manager {
        return this._instance;
    }

    //old method for loading UI prefabs
    public async loadAsync<T extends Asset>(type: Constructor<T>, id: string): Promise<T> {
        return new Promise((resolve, reject) => {
            resources.load(`prefab/UI/${id}`, type, (err, asset) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(asset as T);
            });
        });
    }

    public async loadResource<T extends Asset>(path: string, type: Constructor<T>): Promise<T> {
        const cache_key = `${path}_${type.name}`;

        if (this._cache.has(cache_key)) {
            return this._cache.get(cache_key) as T;
        }

        if (this._loading_promises.has(cache_key)) {
            return this._loading_promises.get(cache_key) as Promise<T>;
        }

        const load_promise = new Promise<T>((resolve, reject) => {
            resources.load(path, type, (err, asset) => {
                this._loading_promises.delete(cache_key);
                if (err) {
                    reject(err);
                    return;
                }
                this._cache.set(cache_key, asset);
                resolve(asset as T);
            });
        });

        this._loading_promises.set(cache_key, load_promise);
        return load_promise;
    }

    public async loadDir<T extends Asset>(path: string, type?: Constructor<T>): Promise<T[]> {
        return new Promise((resolve, reject) => {
            if (type) {
                resources.loadDir(path, type, (err, assets) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(assets as T[]);
                });
            } else {
                resources.loadDir(path, (err, assets) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(assets as T[]);
                });
            }
        });
    }

    public async loadPrefab(path: string): Promise<Prefab> {
        return this.loadResource(path, Prefab);
    }

    public async loadSprite(path: string): Promise<SpriteFrame> {
        return this.loadResource(path, SpriteFrame);
    }

    public async loadTexture(path: string): Promise<Texture2D> {
        return this.loadResource(path, Texture2D);
    }

    public async loadAudio(path: string): Promise<AudioClip> {
        return this.loadResource("audio/"+path, AudioClip);
    }

    public async loadJson(path: string): Promise<JsonAsset> {
        return this.loadResource(path, JsonAsset);
    }

    public async preloadResources(paths: { path: string; type: Constructor<Asset> }[]): Promise<void> {
        const promises = paths.map(({ path, type }) => this.loadResource(path, type));
        await Promise.all(promises);
    }

    public async loadBundle(bundleName: string): Promise<AssetManager.Bundle> {
        return new Promise((resolve, reject) => {
            assetManager.loadBundle(bundleName, (err, bundle) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(bundle);
            });
        });
    }

    public releaseAsset(path: string, type?: Constructor<Asset>): void {
        const cache_key = type ? `${path}_${type.name}` : path;
        const asset = this._cache.get(cache_key);
        if (asset) {
            asset.decRef();
            this._cache.delete(cache_key);
        }
    }

    public releaseAll(): void {
        this._cache.forEach((asset) => {
            asset.decRef();
        });
        this._cache.clear();
        this._loading_promises.clear();
    }

    public getCachedAsset<T extends Asset>(path: string, type: Constructor<T>): T | null {
        const cache_key = `${path}_${type.name}`;
        return this._cache.get(cache_key) as T || null;
    }

    public isCached(path: string, type?: Constructor<Asset>): boolean {
        const cache_key = type ? `${path}_${type.name}` : path;
        return this._cache.has(cache_key);
    }

    public getCacheSize(): number {
        return this._cache.size;
    }
}