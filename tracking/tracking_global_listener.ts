import {_decorator, Component} from 'cc';
import {constant} from "db://assets/configs/constant";
import {tracking_service} from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const {ccclass} = _decorator;

@ccclass('tracking_global_listener')
export class tracking_global_listener extends Component {

    private static readonly END_EVENT_INTERVAL_MS = 500;
    private static readonly DEFAULT_MAX_TRACKING_DURATION_SEC = 60;
    private static _intervalId: number | null = null;
    private static _lastReason = "unknown";
    private static _trackingStartTimeMs = 0;

    onLoad() {
        if (tracking_global_listener._trackingStartTimeMs <= 0) {
            tracking_global_listener._trackingStartTimeMs = Date.now();
        }

        this.fireEndEvents("onLoad");
    }

    onDisable() {
        this.fireEndEvents('onDisable');
    }

    onDestroy() {
        this.stopEndEventInterval();
        tracking_global_listener._trackingStartTimeMs = 0;
    }

    private fireEndEvents(reason: string) {
        if (!this.canTrackEndEvents()) {
            this.stopEndEventInterval();
            return;
        }

        tracking_global_listener._lastReason = reason;
        this.sendEndEvents(reason);

        if (tracking_global_listener._intervalId !== null) return;

        tracking_global_listener._intervalId = window.setInterval(() => {
            if (!this.canTrackEndEvents()) {
                this.stopEndEventInterval();
                return;
            }

            this.sendEndEvents(tracking_global_listener._lastReason);
        }, tracking_global_listener.END_EVENT_INTERVAL_MS);
    }

    private sendEndEvents(reason: string) {
        if (!this.canTrackEndEvents()) {
            return;
        }

        tracking_service.user_drop_off({reason});
        tracking_service.play_duration({reason});
        tracking_service.input_per_second({reason});
        tracking_service.input_count({reason});
        tracking_service.hit_map({reason});
    }

    private canTrackEndEvents(): boolean {
        const startTimeMs = tracking_global_listener._trackingStartTimeMs;
        if (startTimeMs <= 0) {
            return true;
        }

        const elapsedMs = Date.now() - startTimeMs;
        return elapsedMs <= this.getMaxTrackingDurationMs();
    }

    private getMaxTrackingDurationMs(): number {
        const configuredSeconds = constant.TRACKING.MAX_TRACKING_DURATION_SEC;
        if (Number.isFinite(configuredSeconds) && configuredSeconds > 0) {
            return configuredSeconds * 1000;
        }

        return tracking_global_listener.DEFAULT_MAX_TRACKING_DURATION_SEC * 1000;
    }

    private stopEndEventInterval() {
        if (tracking_global_listener._intervalId === null) {
            return;
        }

        window.clearInterval(tracking_global_listener._intervalId);
        tracking_global_listener._intervalId = null;
    }
}
