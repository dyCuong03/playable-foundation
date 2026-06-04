import {_decorator, Component} from 'cc';
import {tracking_service} from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const {ccclass} = _decorator;

/**
 * Binds window-level lifecycle events (pagehide, beforeunload,
 * visibilitychange) so that tracking_service.end() is guaranteed to
 * fire even when the user closes/hides the tab rather than letting
 * the Cocos lifecycle reach tracking_component.Dispose().
 *
 * The old 2-second periodic_snapshot polling has been removed;
 * all session data now flows through the start / interaction /
 * store_trigger / end event model.
 */
@ccclass('tracking_global_listener')
export class tracking_global_listener extends Component {

    private static _windowListenersBound = false;
    private static _boundInstance: tracking_global_listener | null = null;
    private static _pagehideHandler: (() => void) | null = null;
    private static _beforeUnloadHandler: (() => void) | null = null;
    private static _visibilityChangeHandler: (() => void) | null = null;

    onLoad() {
        tracking_global_listener._boundInstance = this;
        this.bindWindowLifecycleEvents();
    }

    onDisable() {
        // end() is fired by tracking_component.Dispose() or by the
        // window unload handlers below — nothing to do here.
    }

    onDestroy() {
        this.unbindWindowLifecycleEvents();
        tracking_global_listener._boundInstance = null;
    }

    private bindWindowLifecycleEvents() {
        if (tracking_global_listener._windowListenersBound || typeof window === "undefined") {
            return;
        }

        const fireEnd = () => {
            try {
                tracking_service.end();
            } catch {
                // never crash the page on unload
            }
        };

        tracking_global_listener._pagehideHandler = fireEnd;

        tracking_global_listener._beforeUnloadHandler = fireEnd;

        tracking_global_listener._visibilityChangeHandler = () => {
            if (document.visibilityState === "hidden") {
                fireEnd();
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
}
