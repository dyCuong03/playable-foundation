import {_decorator, Component} from 'cc';
import {tracking_service} from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const {ccclass} = _decorator;

/**
 * Lifecycle policy — exactly-once terminal end:
 *
 * TERMINAL end   → pagehide | beforeunload | onDestroy
 *                  Guarded by _endFired; fires at most once ever.
 *                  fireStartEventsOnce is called implicitly before any terminal
 *                  end, so start is always guaranteed to precede end.
 *
 * NON-TERMINAL   → visibilitychange 'hidden' flushes a snapshot WITHOUT latching
 *                  _endFired.  Ad networks (and plain tab-switching) routinely
 *                  hide/restore the ad container; treating first-hide as terminal
 *                  would suppress the real end and misreport engagement.
 *
 * onDisable is intentionally NOT wired to fireEndEventsOnce: Cocos fires
 * onDisable for many non-terminal reasons (component toggling, scene transitions).
 * onDestroy is the correct Cocos teardown hook.
 *
 * MRAID: networks that expose window.mraid emit stateChange('hidden') on
 * focus-loss and stateChange('default') on restore — neither is terminal.
 * The genuine teardown is still pagehide/beforeunload which the browser fires
 * on real navigation away or container dismissal.
 */
@ccclass('tracking_global_listener')
export class tracking_global_listener extends Component {

    private static _startFired = false;
    private static _endFired = false;
    private static _windowListenersBound = false;
    private static _pagehideHandler: (() => void) | null = null;
    private static _beforeUnloadHandler: (() => void) | null = null;
    private static _visibilityChangeHandler: (() => void) | null = null;
    private static _mraidStateChangeHandler: ((state: string) => void) | null = null;

    onLoad() {
        tracking_global_listener.fireStartEventsOnce();
        this.bindWindowLifecycleEvents();
    }

    // onDisable is intentionally NOT wired to fireEndEventsOnce.
    // Cocos triggers onDisable for non-terminal reasons (component disabling,
    // scene transitions).  onDestroy is the correct teardown hook.

    onDestroy() {
        tracking_global_listener.fireEndEventsOnce();
        this.unbindWindowLifecycleEvents();
    }

    private static fireStartEventsOnce() {
        if (tracking_global_listener._startFired) {
            return;
        }
        tracking_global_listener._startFired = true;
        tracking_service.startSession();
        tracking_service.playable_start();
        tracking_service.snapshot("start");
    }

    /**
     * Fire the terminal end sequence exactly once.
     * Callers: pagehide, beforeunload, onDestroy — genuine teardown only.
     * NOT called by visibilitychange or onDisable.
     *
     * Guarantees start precedes end: if somehow end fires before start
     * (e.g. pagehide races before onLoad completes), start is fired first.
     */
    private static fireEndEventsOnce() {
        if (tracking_global_listener._endFired) {
            return;
        }
        // Guarantee start always precedes end in any race.
        tracking_global_listener.fireStartEventsOnce();

        tracking_global_listener._endFired = true;
        tracking_service.playable_end();
        tracking_service.snapshot("end");
    }

    private bindWindowLifecycleEvents() {
        if (tracking_global_listener._windowListenersBound || typeof window === "undefined") {
            return;
        }

        // --- Terminal teardown handlers ---
        tracking_global_listener._pagehideHandler = () => {
            tracking_global_listener.fireEndEventsOnce();
        };

        tracking_global_listener._beforeUnloadHandler = () => {
            tracking_global_listener.fireEndEventsOnce();
        };

        window.addEventListener("pagehide", tracking_global_listener._pagehideHandler);
        window.addEventListener("beforeunload", tracking_global_listener._beforeUnloadHandler);

        // --- Non-terminal visibility handler ---
        // Flush a snapshot on hide so we retain engagement data if the page
        // is killed without a pagehide (possible on some mobile browsers), but
        // do NOT latch _endFired — the playable may be restored and end later.
        tracking_global_listener._visibilityChangeHandler = () => {
            if (document.visibilityState === "hidden") {
                tracking_service.snapshot("hidden");
            }
            // Restore (visibilityState === 'visible') needs no special action;
            // the session counter keeps running and start is already fired.
        };

        document.addEventListener("visibilitychange", tracking_global_listener._visibilityChangeHandler);

        // --- Optional MRAID non-terminal state handler ---
        this.bindMraidStateListener();

        tracking_global_listener._windowListenersBound = true;
    }

    /**
     * If the page runs inside an MRAID container (Facebook, AdColony, generic),
     * listen for stateChange.  'hidden' → non-terminal snapshot (same policy as
     * visibilitychange 'hidden').  The real close path (network dismisses the ad)
     * still triggers pagehide/beforeunload, which fire the terminal end.
     */
    private bindMraidStateListener() {
        try {
            const mraid = (window as any).mraid;
            if (!mraid || typeof mraid.addEventListener !== "function") {
                return;
            }

            tracking_global_listener._mraidStateChangeHandler = (state: string) => {
                if (state === "hidden") {
                    // Non-terminal: flush a snapshot without latching _endFired.
                    tracking_service.snapshot("mraid_hidden");
                }
                // 'default' / 'expanded' / 'loading' are informational only.
            };

            mraid.addEventListener("stateChange", tracking_global_listener._mraidStateChangeHandler);
        } catch {
            // MRAID not present — no-op.
        }
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

            // Unbind MRAID stateChange if it was registered.
            try {
                const mraid = (window as any).mraid;
                if (mraid && typeof mraid.removeEventListener === "function" &&
                    tracking_global_listener._mraidStateChangeHandler) {
                    mraid.removeEventListener("stateChange", tracking_global_listener._mraidStateChangeHandler);
                }
            } catch {
                // MRAID not present — no-op.
            }
        }

        tracking_global_listener._pagehideHandler = null;
        tracking_global_listener._beforeUnloadHandler = null;
        tracking_global_listener._visibilityChangeHandler = null;
        tracking_global_listener._mraidStateChangeHandler = null;
        tracking_global_listener._windowListenersBound = false;
    }
}
