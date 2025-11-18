import { _decorator, AudioClip, AudioSource, Component } from 'cc';
const { ccclass,property } = _decorator;

type PlayCompleteCallback = () => void;

@ccclass('AudioEmitter')
export class AudioEmitter extends Component {
    @property(AudioSource)
    audioSource: AudioSource;
    private onPlayComplete?: PlayCompleteCallback;

    public async setAudioClip(audioClip: AudioClip) {
        this.audioSource.clip = audioClip;
        return this;
    }

    public setLoop(isLoop: boolean): this {
        this.audioSource.loop = isLoop;
        return this;
    }

    public setMute(isMute: boolean): this {
        this.audioSource.volume = isMute ? 0 : this.audioSource.volume;
        return this;
    }

    public setVolume(volume: number): this {
        this.audioSource.volume = volume;
        return this;
    }

    public setOnPlayComplete(callback?: PlayCompleteCallback): this {
        this.onPlayComplete = callback;
        return this;
    }

    public async play(): Promise<void> {
        this.audioSource.play();
        if (!this.audioSource.loop) {
            const duration = this.audioSource.clip?.getDuration() ?? 0;
            await new Promise((resolve) => setTimeout(resolve, duration * 1000));
            this.onPlayComplete?.();
        }
    }

    public stop(): void {
        this.audioSource.stop();
    }

    public isPlaying(): boolean {
        return this.audioSource.state === AudioSource.AudioState.PLAYING;
    }
}
