import { _decorator, AudioClip, Component } from 'cc';

const { ccclass, property } = _decorator;

/**
 * AudioContainer - Universal audio management container
 * Can be used across multiple projects
 *
 * Features:
 * - Just drag audio clips into list - names auto-detected from asset names
 * - Params can override audio clips via ParameterController.onUpdate
 * - Dynamic audio registration at runtime
 * - Singleton pattern for easy access
 *
 * Usage:
 * 1. Add AudioContainer component to a persistent node in scene
 * 2. Drag AudioClip assets into the list
 * 3. AudioService will automatically use this container
 * 4. Params will override clips when updated (via onUpdate callback)
 */
@ccclass('AudioContainer')
export class AudioContainer extends Component {
    private static _instance: AudioContainer = null;

    public static get instance(): AudioContainer {
        return this._instance;
    }
    @property({ type: [AudioClip], tooltip: 'List of audio clips - names auto-detected from asset names' })
    audioList: AudioClip[] = [];

    private audioMap: Map<string, AudioClip> = new Map();

    onLoad() {
        // Singleton pattern setup
        if (AudioContainer._instance && AudioContainer._instance !== this) {
            console.warn('[AudioContainer] Multiple instances detected! Destroying duplicate.');
            this.destroy();
            return;
        }
        AudioContainer._instance = this;

        // Build audio map
        this.buildAudioMap();
    }

    onDestroy() {
        // Clear singleton reference
        if (AudioContainer._instance === this) {
            AudioContainer._instance = null;
        }
    }

    /**
     * Build audio map from audio list for fast lookup
     * Audio names are automatically extracted from asset names
     */
    private buildAudioMap(): void {
        this.audioMap.clear();

        this.audioList.forEach(clip => {
            if (!clip) {
                console.warn(`[AudioContainer] Null audio clip in list`);
                return;
            }

            // Auto-detect name from asset name
            const audioName = clip.name;

            if (!audioName) {
                console.warn(`[AudioContainer] Audio clip has no name:`, clip);
                return;
            }

            this.audioMap.set(audioName, clip);
            console.log(`[AudioContainer] Registered audio: ${audioName}`);
        });

        console.log(`[AudioContainer] Total audio clips registered: ${this.audioMap.size}`);
    }


    /**
     * Get audio clip by name
     * @param audioName Audio name key
     * @returns AudioClip or null if not found
     */
    public getAudioClip(audioName: string): AudioClip | null {
        const clip = this.audioMap.get(audioName);

        if (!clip) {
            console.warn(`[AudioContainer] Audio clip not found: ${audioName}`);
            return null;
        }

        return clip;
    }

    /**
     * Check if audio clip exists
     * @param audioName Audio name key
     */
    public hasAudioClip(audioName: string): boolean {
        return this.audioMap.has(audioName);
    }

    /**
     * Get all registered audio names
     */
    public getAllAudioNames(): string[] {
        return Array.from(this.audioMap.keys());
    }

    /**
     * Dynamically register audio clip at runtime
     * @param audioName Audio name key
     * @param clip AudioClip to register
     */
    public registerAudioClip(audioName: string, clip: AudioClip): void {
        if (!audioName || !clip) {
            console.warn(`[AudioContainer] Invalid audio registration:`, audioName, clip);
            return;
        }

        this.audioMap.set(audioName, clip);
        console.log(`[AudioContainer] Dynamically registered audio: ${audioName}`);
    }

    /**
     * Unregister audio clip
     * @param audioName Audio name key
     */
    public unregisterAudioClip(audioName: string): void {
        this.audioMap.delete(audioName);
        console.log(`[AudioContainer] Unregistered audio: ${audioName}`);
    }

    /**
     * Clear all audio clips
     */
    public clearAll(): void {
        this.audioMap.clear();
        console.log(`[AudioContainer] Cleared all audio clips`);
    }

    /**
     * Get debug info
     */
    public getDebugInfo(): string {
        return `[AudioContainer] Total audio clips: ${this.audioMap.size}`;
    }
}