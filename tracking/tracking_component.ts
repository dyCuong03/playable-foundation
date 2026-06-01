import {
    _decorator,
    Node,
    EventTouch,
    find,
    Input,
    view,
    input
} from 'cc';

import { LifecycleComponent } from "db://assets/plugins/playable-foundation/game-foundation/lifecycle_manager";
import { tracking_service } from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const { ccclass, property } = _decorator;

@ccclass('tracking_component')
export class tracking_component extends LifecycleComponent {

    @property(Node)
    canvasNode: Node | null = null;

    private _onFirstTouch?: (e: EventTouch) => void;
    private _onGlobalTouch?: (e: EventTouch) => void;

    private _firstInputCaptured: boolean = false;

    /* ================= LIFECYCLE ================= */

    override Initialize(): void {
        super.Initialize();

        // Resolve canvas node early so the cleanup step below uses the same reference as the new binding.
        if (!this.canvasNode) {
            this.canvasNode = find('Canvas');
        }

        // ===== GUARD AGAINST DOUBLE-BIND ON RE-INIT =====
        // If Initialize is called more than once (e.g. after a soft reset), remove any stale listeners
        // before creating new ones.  Dispose does the same cleanup, but re-init may not call Dispose first.
        if (this._onFirstTouch && this.canvasNode) {
            this.canvasNode.off(
                Input.EventType.TOUCH_START,
                this._onFirstTouch,
                this,
                true
            );
        }
        if (this._onGlobalTouch) {
            input.off(
                Input.EventType.TOUCH_END,
                this._onGlobalTouch,
                this
            );
        }
        this._onFirstTouch = undefined;
        this._onGlobalTouch = undefined;
        this._firstInputCaptured = false;

        // ===== START SESSION =====
        tracking_service.startSession();

        /**
         * ===== FIRST INPUT (Canvas + Capture)
         * Registered with capture=true on TOUCH_START so it fires before any node handlers.
         * Removes itself immediately after the first touch and hands off to the global listener.
         */
        this._onFirstTouch = (e: EventTouch) => {
            if (this._firstInputCaptured) return;

            this._firstInputCaptured = true;

            const p = e.getUILocation();
            this.recordHit(p.x, p.y);

            tracking_service.first_input_time();

            this.canvasNode?.off(
                Input.EventType.TOUCH_START,
                this._onFirstTouch!,
                this,
                true
            );

            this.startGlobalTracking();
        };

        this.canvasNode?.on(
            Input.EventType.TOUCH_START,
            this._onFirstTouch,
            this,
            true
        );
    }

    override Start() {
        super.Start();
    }

    override Dispose(): void {
        super.Dispose();

        // ===== CLEAN FIRST INPUT LISTENER =====
        if (this.canvasNode && this._onFirstTouch) {
            this.canvasNode.off(
                Input.EventType.TOUCH_START,
                this._onFirstTouch,
                this,
                true
            );
        }

        // ===== CLEAN GLOBAL INPUT =====
        if (this._onGlobalTouch) {
            input.off(
                Input.EventType.TOUCH_END,
                this._onGlobalTouch,
                this
            );
        }

        this._onFirstTouch = undefined;
        this._onGlobalTouch = undefined;
    }

    /* ================= TRACKING ================= */

    private startGlobalTracking() {
        // Should never be called twice (guarded by _firstInputCaptured in _onFirstTouch),
        // but assign the handler reference before binding so Dispose can always clean it up.
        this._onGlobalTouch = (e: EventTouch) => {
            const p = e.getUILocation();
            this.recordHit(p.x, p.y);
        };

        input.on(
            Input.EventType.TOUCH_END,
            this._onGlobalTouch,
            this
        );
    }

    private recordHit(uiX: number, uiY: number) {
        const size = view.getVisibleSize();
        const w = Math.max(1, size.width);
        const h = Math.max(1, size.height);

        let x = uiX / w;
        let y = uiY / h;

        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));

        tracking_service.record_hit(x, y);
    }
}
