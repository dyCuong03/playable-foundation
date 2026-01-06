import {_decorator, Component} from 'cc';
import {EDITOR} from 'cc/env';
import {tracking_service} from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const {ccclass} = _decorator;

@ccclass('tracking_global_listener')
export class tracking_global_listener extends Component {

    private static _sent = false;

    onLoad() {
        if (EDITOR) return;
        this.registerBrowserListeners();
    }

    onDisable() {
        this.fireEndEvents('onDisable');
    }

    /* ================= INTERNAL ================= */

    private registerBrowserListeners() {
        window.addEventListener('pagehide', this.onPageHide, {capture: true});
        document.addEventListener('visibilitychange', this.onVisibilityChange, true);
        window.addEventListener('beforeunload', this.onBeforeUnload, {capture: true});
    }

    /* ================= HANDLERS ================= */

    private onPageHide = () => {
        this.fireEndEvents('pagehide');
    };

    private onBeforeUnload = () => {
        this.fireEndEvents('beforeunload');
    };

    private onVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
            this.fireEndEvents('visibility_hidden');
        }
    };

    /* ================= FIRE EVENTS ================= */

    private fireEndEvents(reason: string) {
        if (tracking_global_listener._sent) return;

        tracking_global_listener._sent = true;

        tracking_service.user_drop_off({reason});
        tracking_service.play_duration({reason});
        tracking_service.input_per_second({reason});
        tracking_service.input_count({reason});
        tracking_service.hit_map({reason});
    }
}
