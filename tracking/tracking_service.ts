import {Tracking} from "db://assets/plugins/playable-foundation/tracking/core/Tracking";

// Forward-compatible opts type — gains terminal?: boolean once core-engineer updates Tracking.trackByURI.
// Structurally assignable to the current opts type (all fields are compatible optional booleans) so no
// type-cast is needed; the terminal field passes through to the transport at runtime.
type TrkOpts = { beacon?: boolean; force?: boolean; terminal?: boolean };

export class tracking_service {

    private static _startTime = 0;
    private static _firstInputTime = 0;

    private static _fitTracked = false;
    private static _inputCount = 0;

    private static _sessionStarted = false;

    // ===== HIT MAP COUNTERS =====
    // Declared here (before startSession) so declaration order matches the reset assignments below.
    private static _hitTotal = 0;
    private static _hitTL = 0;
    private static _hitTR = 0;
    private static _hitBL = 0;
    private static _hitBR = 0;

    /* ================= SESSION ================= */

    static startSession() {
        if (this._sessionStarted) return;
        this._sessionStarted = true;

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
    }

    /* ================= SNAPSHOT ================= */

    static snapshot(reason: string, extraData: any = {}) {
        const hitMap = this.buildHitMapPayload();

        const payload = {
            reason,
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
        };

        // End snapshots are terminal: beacon survives page-unload; terminal flag tells the transport
        // to dedupe by event name so exactly one tracking_snapshot("end") fires per session.
        // All other snapshots are non-terminal (force only, no beacon).
        const opts: TrkOpts = reason === "end"
            ? { beacon: true, force: true, terminal: true }
            : { force: true };
        Tracking.trackByURI("tracking_snapshot", payload, opts);
    }

    /* ================= PLAYABLE START ================= */

    static playable_start(extra: any = {}) {
        Tracking.trackByURI("playable_start", { ...extra }, { force: true });
    }

    /* ================= PLAYABLE END ================= */

    static playable_end(extra: any = {}) {
        // Terminal end event: beacon ensures delivery on page unload; terminal flag tells the transport
        // to dedupe by event name so exactly one playable_end fires per session.
        const opts: TrkOpts = { beacon: true, force: true, terminal: true };
        Tracking.trackByURI("playable_end", {
            duration_sec: this.getSessionDurationSec(),
            ...extra,
        }, opts);
    }

    /* ================= DROP OFF ================= */

    static user_drop_off(extraData: any = {}) {
        Tracking.trackByURI("user_drop_off", {
            duration_sec: this.getSessionDurationSec(),
            ...extraData,
        });
    }

    /* ================= FIRST INPUT TIME ================= */

    static first_input_time(_extraData: any = {}) {
        if (this._fitTracked || this._startTime <= 0) {
            return;
        }

        this._fitTracked = true;
        this._firstInputTime = Date.now();
    }

    /* ================= INPUT COUNT ================= */

    static input_count(extraData: any = {}) {
        Tracking.trackByURI("input_count", {
            count: this._inputCount,
            ...extraData,
        });
    }

    /* ================= PLAY DURATION ================= */

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

    static input_per_second(extraData: any = {}) {
        if (this._firstInputTime <= 0) {
            return;
        }

        Tracking.trackByURI("input_per_second", {
            input_per_second: this.getInputPerSecondValue(),
            ...extraData,
        });
    }

    /* ================= HIT MAP (OPTIONAL) ================= */

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
        // Use max(1, playDuration) to avoid division by zero in the first second.
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
}
