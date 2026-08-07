import { _decorator, Node, AudioSource } from 'cc';
import { AudioEmitter } from './AudioEmitter';
import { AudioContainer } from './AudioContainer';
import { Singleton } from 'db://assets/plugins/playable-foundation/game-foundation/Singleton';
const { ccclass } = _decorator;

@ccclass('AudioService')
export class AudioService extends Singleton<AudioService> {
    private musicSource: AudioEmitter = null;
    private sfxLoopEmitters: Map<string, AudioEmitter> = new Map();
    private musicQueue: Array<{ id: string; isLoop: boolean }> = [];
    private sfxVolume: number = 0.75;
    private isMusicMute: boolean = false;
    private isSfxMute: boolean = false;

    private _createEmitter(): AudioEmitter {
        const node = new Node('AudioEmitter');
        node.addComponent(AudioSource);
        const emitter = node.addComponent(AudioEmitter);
        emitter.audioSource = node.getComponent(AudioSource);
        AudioContainer.instance?.node.addChild(node);
        return emitter;
    }

    public async playSfx(audioPath: string, isLoop: boolean = false): Promise<void> {
        const audioClip = AudioContainer.instance?.getAudioClip(audioPath);
        if (!audioClip) {
            console.error(`[AudioService] Audio clip not found in AudioContainer: ${audioPath}`);
            return;
        }

        const emitter = this._createEmitter();
        if (isLoop) this.sfxLoopEmitters.set(audioPath, emitter);

        await emitter.setAudioClip(audioClip);
        emitter
            .setLoop(isLoop)
            .setMute(this.isSfxMute)
            .setVolume(this.isSfxMute ? 0 : this.sfxVolume)
            .setOnPlayComplete(() => emitter.node.destroy());

        await emitter.play();
    }

    public async playMusic(audioPath: string, force: boolean = false, isLoop: boolean = true): Promise<void> {
        if (!this.musicSource) {
            this.musicSource = this._createEmitter();
        }

        if (!force) {
            this.musicQueue.push({ id: audioPath, isLoop });
            if (!this.musicSource.isPlaying()) {
                const { id, isLoop } = this.musicQueue.shift()!;
                this.playMusic(id, true, isLoop);
            }
            return;
        }

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
        if (this.musicSource) this.musicSource.stop();
        this.musicQueue = [];
    }

    public isMusicPlaying(): boolean {
        return !!this.musicSource && this.musicSource.isPlaying();
    }

    /**
     * Pre-load BGM clip vào musicSource nhưng không play. Gọi lúc scene load để chuẩn bị.
     * Sau đó gọi playPreloadedMusic() trong user gesture (SYNC) để đảm bảo browser autoplay policy pass ngay lần đầu.
     */
    public preloadMusic(audioPath: string, isLoop: boolean = true): void {
        if (!this.musicSource) this.musicSource = this._createEmitter();
        const clip = AudioContainer.instance?.getAudioClip(audioPath);
        if (!clip) {
            console.error(`[AudioService] preloadMusic: clip not found: ${audioPath}`);
            return;
        }
        this.musicSource.audioSource.clip = clip;
        this.musicSource.audioSource.loop = isLoop;
        this.musicSource.audioSource.volume = this.isMusicMute ? 0 : 1;
    }

    /** Play music đã preload. SYNC — an toàn cho browser autoplay policy khi gọi trong touch handler. */
    public playPreloadedMusic(): void {
        if (!this.musicSource || !this.musicSource.audioSource.clip) {
            console.warn('[AudioService] playPreloadedMusic: chưa preload — gọi preloadMusic() trước.');
            return;
        }
        this.musicSource.audioSource.play();
    }

    public stopSfx(audioPath: string): void {
        const emitter = this.sfxLoopEmitters.get(audioPath);
        if (emitter) {
            emitter.stop();
            this.sfxLoopEmitters.delete(audioPath);
        }
    }

    public muteSfx(isMute: boolean): void {
        this.isSfxMute = isMute;
        this.sfxLoopEmitters.forEach(e => e.setMute(isMute));
    }

    public muteMusic(isMute: boolean): void {
        this.isMusicMute = isMute;
        if (this.musicSource) this.musicSource.setMute(isMute);
    }

    public isSfxOn(): boolean { return !this.isSfxMute; }
    public isMusicOn(): boolean { return !this.isMusicMute; }

    public setSfxVolume(volume: number): void {
        this.sfxVolume = volume;
        this.sfxLoopEmitters.forEach(e => e.setVolume(volume));
    }

    public setMusicVolume(volume: number): void {
        if (this.musicSource) this.musicSource.setVolume(volume);
    }
}
