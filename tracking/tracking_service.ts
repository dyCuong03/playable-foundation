import {Tracking} from "db://assets/plugins/playable-foundation/tracking/core/Tracking";

export class tracking_service {
    static user_drop_off(startTime: number) {
        const now = Date.now();
        const durationSec = Math.floor((now - startTime) / 1000);

        Tracking.trackByURI("user_drop_off", {
            duration_sec: durationSec,
        });
    }

    static first_input_time() {

    }

    static play_duration() {

    }

    static input_count() {

    }

    static input_per_second() {

    }

    static heap_map() {

    }
}