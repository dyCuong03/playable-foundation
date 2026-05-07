import {_decorator, Component} from 'cc';
import {constant} from "db://assets/configs/constant";
import {tracking_service} from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const {ccclass} = _decorator;

@ccclass('tracking_global_listener')
export class tracking_global_listener extends Component {

    private static readonly END_EVENT_INTERVAL_MS = 2000;
    private static readonly DEFAULT_MAX_TRACKING_DURATION_SEC = 60;
    private static _intervalId: number | null = null;
    private static _lastReason = "unknown";
    private static _trackingStartTimeMs = 0;
    private static _windowListenersBound = false;
    private static _boundInstance: tracking_global_listener | null = null;
    private static _pagehideHandler: (() => void) | null = null;
    private static _beforeUnloadHandler: (() => void) | null = null;
    private static _visibilityChangeHandler: (() => void) | null = null;

    onLoad() {
        if (tracking_global_listener._trackingStartTimeMs <= 0) {
            tracking_global_listener._trackingStartTimeMs = Date.now();
        }

        tracking_global_listener._boundInstance = this;
        this.bindWindowLifecycleEvents();
        this.fireEndEvents("onLoad");
    }

    onDisable() {
        this.fireEndEvents('onDisable');
    }

    onDestroy() {
        this.stopEndEventInterval();
        this.unbindWindowLifecycleEvents();
        tracking_global_listener._trackingStartTimeMs = 0;
        tracking_global_listener._boundInstance = null;
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

        tracking_service.periodic_snapshot({reason});
    }

    private bindWindowLifecycleEvents() {
        if (tracking_global_listener._windowListenersBound || typeof window === "undefined") {
            return;
        }

        const sendFinalSnapshot = (reason: string) => {
            const instance = tracking_global_listener._boundInstance;
            if (!instance) {
                return;
            }

            instance.sendEndEvents(reason);
        };

        tracking_global_listener._pagehideHandler = () => {
            sendFinalSnapshot("pagehide");
        };

        tracking_global_listener._beforeUnloadHandler = () => {
            sendFinalSnapshot("beforeunload");
        };

        tracking_global_listener._visibilityChangeHandler = () => {
            if (document.visibilityState === "hidden") {
                sendFinalSnapshot("visibility_hidden");
            }
        };

        window.addEventListener("pagehide", tracking_global_listener._pagehideHandler);
        window.addEventListener("beforeunload", tracking_global_listener._beforeUnloadHandler);
        document.addEventListener("visibilitychange", tracking_global_listener._visibilityChangeHandler);

        tracking_global_listener._windowListenersBound = true;
    }

    private unbindWindowLifecycleEvents() {
        if (typeof window !== "undefined") {
            if (tracking_global_listener._pagehideHandler) {
                window.removeEventListener("pagehide", tracking_global_listener._pagehideHandler);
            }

            if (tracking_global_listener._beforeUnloadHandler) {
                window.removeEventListener("beforeunload", tracking_global_listener._beforeUnloadHandler);
            }

            if (tracking_global_listener._visibilityChangeHandler) {
                document.removeEventListener("visibilitychange", tracking_global_listener._visibilityChangeHandler);
            }
        }

        tracking_global_listener._pagehideHandler = null;
        tracking_global_listener._beforeUnloadHandler = null;
        tracking_global_listener._visibilityChangeHandler = null;
        tracking_global_listener._windowListenersBound = false;
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
