import {Tracking} from "db://assets/plugins/playable-foundation/tracking/core/Tracking";

export class tracking_service {

    private static _startTime = 0;
    private static _firstInputTime = 0;

    private static _fitTracked = false;
    private static _inputCount = 0;

    private static _startFired = false;
    private static _endFired = false;
    private static _rawInteractCount = 0;

    /* ================= SESSION ================= */

    static startSession() {
        Tracking.resetSession();
        Tracking.init();

        this._startTime = Date.now();
        this._firstInputTime = 0;
        this._fitTracked = false;
        this._inputCount = 0;

        this._hitTotal = 0;
        this._hitTL = 0;
        this._hitTR = 0;
        this._hitBL = 0;
        this._hitBR = 0;

        this._startFired = false;
        this._endFired = false;
        this._rawInteractCount = 0;
    }

    /* ================= PERIODIC SNAPSHOT ================= */

    /** @deprecated Replaced by start/interaction/store_trigger/end events. */
    static periodic_snapshot(extraData: any = {}) {
        const hitMap = this.buildHitMapPayload();

        Tracking.trackByURI("tracking_snapshot", {
            duration_sec: this.getSessionDurationSec(),
            play_duration_sec: this.getPlayDurationSec(),
            input_count: this._inputCount,
            input_per_second: this.getInputPerSecondValue(),
            first_input_captured: this._fitTracked ? 1 : 0,
            first_input_time_sec: this.getFirstInputDelaySec(),

            total_hits: hitMap.total_hits,
            top_left_pct: hitMap.top_left_pct,
            top_right_pct: hitMap.top_right_pct,
            bottom_left_pct: hitMap.bottom_left_pct,
            bottom_right_pct: hitMap.bottom_right_pct,
            ...extraData,
        });
    }

    /* ================= DROP OFF ================= */

    /** @deprecated Use end() instead. */
    static user_drop_off(extraData: any = {}) {
        Tracking.trackByURI("user_drop_off", {
            duration_sec: this.getSessionDurationSec(),
            ...extraData,
        });
    }

    /* ================= FIRST INPUT TIME ================= */

    /** @deprecated Internal metric; no replacement needed in game code. */
    static first_input_time(_extraData: any = {}) {
        if (this._fitTracked || this._startTime <= 0) {
            return;
        }

        this._fitTracked = true;
        this._firstInputTime = Date.now();
    }

    /* ================= INPUT COUNT ================= */

    /** @deprecated interact_count is now sent inside end() event_params. */
    static input_count(extraData: any = {}) {
        Tracking.trackByURI("input_count", {
            count: this._inputCount,
            ...extraData,
        });
    }

    /* ================= PLAY DURATION ================= */

    /** @deprecated Replaced by server-side received_at diff. */
    static play_duration(extraData: any = {}) {
        if (this._firstInputTime <= 0) {
            return;
        }

        const durationSec = this.getPlayDurationSec();

        Tracking.trackByURI("play_duration", {
            duration_sec: durationSec,
            ...extraData,
        });
    }

    /* ================= INPUT PER SECOND ================= */

    /** @deprecated Replaced by interact_count in end() event_params. */
    static input_per_second(extraData: any = {}) {
        if (this._firstInputTime <= 0) {
            return;
        }

        Tracking.trackByURI("input_per_second", {
            input_per_second: this.getInputPerSecondValue(),
            ...extraData,
        });
    }


    // ===== HIT MAP COUNTER =====
    private static _hitTotal = 0;
    private static _hitTL = 0;
    private static _hitTR = 0;
    private static _hitBL = 0;
    private static _hitBR = 0;

    /* ================= HIP MAP (OPTIONAL) ================= */

    /** @deprecated No replacement; removed from new event model. */
    static hit_map(extraData: any = {}) {
        if (this._hitTotal <= 0) return;
        const hitMap = this.buildHitMapPayload();

        Tracking.trackByURI("hit_map", {
            total_hits: hitMap.total_hits,
            top_left_pct: hitMap.top_left_pct,
            top_right_pct: hitMap.top_right_pct,
            bottom_left_pct: hitMap.bottom_left_pct,
            bottom_right_pct: hitMap.bottom_right_pct,
            ...extraData,
        });
    }

    static record_hit(x: number, y: number) {
        if (this._startTime <= 0) return;

        this._hitTotal++;
        this._inputCount++;

        if (x < 0.5 && y < 0.5) this._hitTL++;
        else if (x >= 0.5 && y < 0.5) this._hitTR++;
        else if (x < 0.5 && y >= 0.5) this._hitBL++;
        else this._hitBR++;
    }

    private static getSessionDurationSec(): number {
        if (this._startTime <= 0) {
            return 0;
        }

        return Math.max(0, Math.floor((Date.now() - this._startTime) / 1000));
    }

    private static getFirstInputDelaySec(): number {
        if (this._firstInputTime <= 0 || this._startTime <= 0) {
            return 0;
        }

        return Math.max(0, Math.floor((this._firstInputTime - this._startTime) / 1000));
    }

    private static getPlayDurationSec(): number {
        if (this._firstInputTime <= 0) {
            return 0;
        }

        return Math.max(0, Math.floor((Date.now() - this._firstInputTime) / 1000));
    }

    private static getInputPerSecondValue(): number {
        const playDurationSec = Math.max(1, this.getPlayDurationSec());
        const ips = this._inputCount / playDurationSec;
        return Number(ips.toFixed(2));
    }

    private static buildHitMapPayload() {
        if (this._hitTotal <= 0) {
            return {
                total_hits: 0,
                top_left_pct: 0,
                top_right_pct: 0,
                bottom_left_pct: 0,
                bottom_right_pct: 0,
            };
        }

        const pct = (v: number) =>
            Number(((v / this._hitTotal) * 100).toFixed(2));

        return {
            total_hits: this._hitTotal,
            top_left_pct: pct(this._hitTL),
            top_right_pct: pct(this._hitTR),
            bottom_left_pct: pct(this._hitBL),
            bottom_right_pct: pct(this._hitBR),
        };
    }

    /* ================= NEW EVENT API ================= */

    /**
     * Fire the "start" event exactly once per session.
     * Called automatically from tracking_component.Initialize().
     * platform and campaign default to values extracted from URL/super_html.
     */
    static start(params: { platform?: string; campaign?: object } = {}): void {
        if (this._startFired) {
            return;
        }
        this._startFired = true;
        try {
            const platform = params.platform || Tracking.getPlatform();
            const campaign = params.campaign ?? Tracking.getCampaignPayload();
            Tracking.trackByURI("start", {
                event_params: JSON.stringify({
                    platform,
                    campaign,
                }),
            });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Fire an "interaction" event and count it toward interact_count.
     * @param name  Meaningful interaction label (e.g. "swipe_card").
     */
    static trackInteraction(name: string): void {
        try {
            this.recordRawInteract();
            Tracking.trackByURI("interaction", {
                event_params: JSON.stringify({ name }),
            });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Fire a "store_trigger" event and count it toward interact_count.
     * @param name  CTA label (e.g. "cta_store").
     */
    static trackStoreTrigger(name: string): void {
        try {
            this.recordRawInteract();
            Tracking.trackByURI("store_trigger", {
                event_params: JSON.stringify({ name }),
            });
        } catch (e) {
            console.error(e);
        }
    }

    /**
     * Increment raw interaction counter.
     * Called automatically by tracking_component on each touch (wired in
     * tracking_component.recordHit()), and internally by trackInteraction()
     * and trackStoreTrigger(). Call directly for non-touch interactions.
     */
    static recordRawInteract(): void {
        this._rawInteractCount++;
    }

    /**
     * Fire the "end" event exactly once per session, carrying the
     * total raw interact_count accumulated since start.
     * Called automatically from tracking_component.Dispose() and
     * from tracking_global_listener on pagehide/beforeunload.
     */
    static end(): void {
        if (this._endFired) {
            return;
        }
        this._endFired = true;
        try {
            Tracking.trackByURI("end", {
                event_params: JSON.stringify({ interact_count: this._rawInteractCount }),
            });
        } catch (e) {
            console.error(e);
        }
    }
}
