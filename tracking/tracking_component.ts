import {_decorator, Node, EventTouch, input, Input, view} from 'cc';
import {LifecycleComponent} from "db://assets/plugins/playable-foundation/game-foundation/lifecycle_manager";
import {tracking_service} from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const { ccclass, property } = _decorator;

@ccclass('tracking_component')
export class tracking_component extends LifecycleComponent {

    @property(Node)
    canvasNode: Node | null = null;

    private _onTouchStart?: (e: EventTouch) => void;

    override Initialize(): void {
        super.Initialize();

        // ===== START SESSION =====
        tracking_service.startSession();

        this._onTouchStart = (e: EventTouch) => {
            const p = e.getUILocation();
            this.recordHit(p.x, p.y);
        };
        this.canvasNode.on(
            Input.EventType.TOUCH_START,
            this._onTouchStart,
            this,
            true // capture phase
        );
    }

    override Start() {
        super.Start();
    }

    override Dispose(): void {
        super.Dispose();

        // ===== REMOVE LISTENERS =====
        if (this.canvasNode && this._onTouchStart) {
            this.canvasNode.off(
                Input.EventType.TOUCH_START,
                this._onTouchStart,
                this,
                true
            );
        }

        this._onTouchStart = undefined;

        tracking_service.user_drop_off();
        tracking_service.play_duration();
        tracking_service.input_per_second();
        tracking_service.input_count();
        tracking_service.hit_map();
    }

    /* ================= INTERNAL ================= */

    private recordHit(uiX: number, uiY: number) {
        const size = view.getVisibleSize();
        const w = Math.max(1, size.width);
        const h = Math.max(1, size.height);

        let x = uiX / w;
        let y = uiY / h;

        x = Math.max(0, Math.min(1, x));
        y = Math.max(0, Math.min(1, y));

        tracking_service.first_input_time();
        tracking_service.record_hit(x, y);
    }
}
