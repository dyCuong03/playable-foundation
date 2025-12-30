import {_decorator} from 'cc';
import {LifecycleComponent} from "db://assets/plugins/playable-foundation/game-foundation/lifecycle_manager";
import {tracking_service} from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const {ccclass, property} = _decorator;

@ccclass('tracking_component')
export class tracking_component extends LifecycleComponent {
    private startTime: number = 0;

    override Initialize(): void {
        super.Initialize();
        this.startTime = Date.now();
    }

    override Dispose() {
        super.Dispose();
        tracking_service.user_drop_off(this.startTime);
    }
}


