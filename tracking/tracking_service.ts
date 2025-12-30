import {Tracking} from "db://assets/plugins/playable-foundation/tracking/core/Tracking";

export class tracking_service {

    private static _startTime = 0;
    private static _firstInputTime = 0;

    private static _fitTracked = false;
    private static _inputCount = 0;

    /* ================= SESSION ================= */

    static startSession() {
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

    /* ================= DROP OFF ================= */

    static user_drop_off(extraData: any = {}) {
        const now = Date.now();
        const durationSec = Math.floor((now - this._startTime) / 1000);

        Tracking.trackByURI("user_drop_off", {
            duration_sec: durationSec,
            ...extraData,
        });
    }

    /* ================= FIRST INPUT TIME ================= */

    static first_input_time(extraData: any = {}) {
        if (this._fitTracked || this._startTime <= 0) {
            return;
        }

        this._fitTracked = true;
        this._firstInputTime = Date.now();

        const durationSec = Math.floor((this._firstInputTime - this._startTime) / 1000);

        Tracking.trackByURI("first_input_time", {
            duration_sec: durationSec,
            ...extraData,
        });
    }

    /* ================= INPUT COUNT ================= */

    static input_count(extraData: any = {}) {
        this._inputCount++;

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

        const now = Date.now();
        const durationSec = Math.max(
            0,
            Math.floor((now - this._firstInputTime) / 1000)
        );

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

        const now = Date.now();
        const playDurationSec = Math.max(
            1,
            Math.floor((now - this._firstInputTime) / 1000)
        );

        const ips = this._inputCount / playDurationSec;

        Tracking.trackByURI("input_per_second", {
            input_count: this._inputCount,
            play_duration_sec: playDurationSec,
            input_per_second: Number(ips.toFixed(2)),
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

    static hit_map() {
        if (this._hitTotal <= 0) return;

        const pct = (v: number) =>
            Number(((v / this._hitTotal) * 100).toFixed(2));

        Tracking.trackByURI("hit_map", {
            total_hits: this._hitTotal,

            top_left_pct: pct(this._hitTL),
            top_right_pct: pct(this._hitTR),
            bottom_left_pct: pct(this._hitBL),
            bottom_right_pct: pct(this._hitBR),
        });
    }

    static record_hit(x: number, y: number) {
        if (this._startTime <= 0) return;

        this._hitTotal++;

        if (x < 0.5 && y < 0.5) this._hitTL++;
        else if (x >= 0.5 && y < 0.5) this._hitTR++;
        else if (x < 0.5 && y >= 0.5) this._hitBL++;
        else this._hitBR++;
    }
}
