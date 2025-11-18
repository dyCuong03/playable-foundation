import { _decorator, resources, Prefab } from 'cc';
import { AudioEmitter } from './AudioEmitter';
import {AudioContainer} from "./AudioContainer";
import {object_pool_manager} from "db://assets/plugins/playable-foundation/game-foundation/object_pool";
import {Singleton} from "db://assets/plugins/playable-foundation/game-foundation/Singleton";
const { ccclass } = _decorator;

@ccclass('AudioService')
export class AudioService extends Singleton<AudioService>{
    private musicSource: AudioEmitter = null;
    private sfxLoopEmitters: Map<string, AudioEmitter> = new Map();
    private musicQueue: Array<{ id: string; isLoop: boolean }> = [];
    private sfxVolume: number = 0.75;
    private isMusicMute: boolean = false;
    private isSfxMute: boolean = false;
    private audioEmitterPrefab: Prefab = null;
    private _loadEmitterPromise: Promise<Prefab> = null;

    private async loadAudioEmitterPrefab(): Promise<Prefab> {
        if (this.audioEmitterPrefab) {
            return this.audioEmitterPrefab;
        }

        if (this._loadEmitterPromise) {
            return this._loadEmitterPromise;
        }

        this._loadEmitterPromise = new Promise<Prefab>((resolve, reject) => {
            resources.load('prefab/AudioEmitter', Prefab, (err, prefab) => {
                if (err) {
                    this._loadEmitterPromise = null;
                    reject(err);
                } else {
                    this.audioEmitterPrefab = prefab;
                    resolve(prefab);
                }
            });
        });

        return this._loadEmitterPromise;
    }


    public async playSfx(audioPath: string, isLoop: boolean = false): Promise<void> {
        await this.loadAudioEmitterPrefab();
        const emitter = object_pool_manager.instance.Spawn(this.audioEmitterPrefab).getComponent(AudioEmitter);
        if (isLoop) {
            this.sfxLoopEmitters.set(audioPath, emitter);
        }

        // Load audio from AudioContainer
        const audioClip = AudioContainer.instance?.getAudioClip(audioPath);
        if (!audioClip) {
            console.error(`[AudioService] Audio clip not found in AudioContainer: ${audioPath}`);
            return;
        }

        await emitter.setAudioClip(audioClip);

        emitter
            .setLoop(isLoop)
            .setMute(this.isSfxMute)
            .setVolume(this.isSfxMute ? 0 : this.sfxVolume)
            .setOnPlayComplete(() => {
                object_pool_manager.instance.Recycle(emitter.node);
            });

        await emitter.play();
    }

    public async playMusic(audioPath: string, force: boolean = false, isLoop: boolean = true): Promise<void> {
        await this.loadAudioEmitterPrefab();
        if (!this.musicSource) {
            this.musicSource = object_pool_manager.instance.Spawn(this.audioEmitterPrefab).getComponent(AudioEmitter);
        }

        if (!force) {
            this.musicQueue.push({ id: audioPath, isLoop });
            if (!this.musicSource.isPlaying()) {
                const { id, isLoop } = this.musicQueue.shift()!;
                this.playMusic(id, true, isLoop);
            }
            return;
        }

        // Load audio from AudioContainer
        const audioClip = AudioContainer.instance?.getAudioClip(audioPath);
        if (!audioClip) {
            console.error(`[AudioService] Audio clip not found in AudioContainer: ${audioPath}`);
            return;
        }

        await this.musicSource.setAudioClip(audioClip);

        this.musicSource
            .setLoop(isLoop)
            .setMute(this.isMusicMute)
            .setOnPlayComplete(() => {
                if (this.musicQueue.length > 0) {
                    const next = this.musicQueue.shift()!;
                    this.playMusic(next.id, false, next.isLoop);
                }
            });

        await this.musicSource.play();
    }


    public stopMusic(): void {
        if (this.musicSource) {
            this.musicSource.stop();
        }
        this.musicQueue = [];
    }

    public stopSfx(audioPath: string): void {
        const emitter = this.sfxLoopEmitters.get(audioPath);
        if (emitter) {
            emitter.stop();
            this.sfxLoopEmitters.delete(audioPath);
        } else {
            console.warn(`SFX ${audioPath} is not playing.`);
        }
    }

    public muteSfx(isMute: boolean): void {
        this.isSfxMute = isMute;
        this.sfxLoopEmitters.forEach((emitter) => emitter.setMute(isMute));
    }

    public muteMusic(isMute: boolean): void {
        this.isMusicMute = isMute;
        if (this.musicSource) {
            this.musicSource.setMute(isMute);
        }
    }

    public isSfxOn(): boolean {
        return !this.isSfxMute;
    }

    public isMusicOn(): boolean {
        return !this.isMusicMute;
    }

    public setSfxVolume(volume: number): void {
        this.sfxVolume = volume;
        this.sfxLoopEmitters.forEach((emitter) => emitter.setVolume(volume));
    }

    public setMusicVolume(volume: number): void {
        if (this.musicSource) {
            this.musicSource.setVolume(volume);
        }
    }
}
