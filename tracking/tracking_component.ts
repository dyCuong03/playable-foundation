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

        // ===== START SESSION =====
        tracking_service.startSession();
        tracking_service.start();

        if (!this.canvasNode) {
            this.canvasNode = find('Canvas');
        }

        /**
         * ===== FIRST INPUT (Canvas + Capture)
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

        // ===== FIRE END EVENT =====
        tracking_service.end();

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
        tracking_service.recordRawInteract();
    }
}
