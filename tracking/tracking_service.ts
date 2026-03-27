import {Tracking} from "db://assets/plugins/playable-foundation/tracking/core/Tracking";

export class tracking_service {

    private static _startTime = 0;
    private static _firstInputTime = 0;

    private static _fitTracked = false;
    private static _inputCount = 0;

    /* ================= SESSION ================= */

    static startSession() {
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

    /* ================= PERIODIC SNAPSHOT ================= */

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


    // ===== HIT MAP COUNTER =====
    private static _hitTotal = 0;
    private static _hitTL = 0;
    private static _hitTR = 0;
    private static _hitBL = 0;
    private static _hitBR = 0;

    /* ================= HIP MAP (OPTIONAL) ================= */

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
}
