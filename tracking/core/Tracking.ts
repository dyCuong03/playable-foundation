import { EDITOR } from 'cc/env';
import {constant} from "db://assets/configs/constant";
import super_html_playable from "db://assets/plugins/playable-foundation/super-html/super_html_playable";
export class Tracking {
    private static readonly BASE_URL =
        "https://test.kyvuong.mobi/p.gif";

    private static _sessionId: string = Tracking.generateSessionId();
    private static _referer: string = Tracking.getReferer();

    private static generateSessionId(): string {
        return (
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 10)
        );
    }

    private static getReferer(): string {
        try {
            return document.referrer || "";
        } catch {
            return "";
        }
    }

    static trackByURI(event: string, data: any = {}) {
        const isLocal = this.isRunningLocal();

        if (EDITOR || isLocal) {
            console.log('[Tracking][Editor]', event, data);
            return;
        }

        try {
            let q = "e=" + encodeURIComponent(event);
            q += "&pid=" + constant.TRACKING.PACKAGE_NAME;
            q += "&playable_id=" + constant.TRACKING.PLAYABLE_ID;
            q += "&sid=" + encodeURIComponent(this._sessionId);
            q += "&ref=" + encodeURIComponent(this._referer);
            q += "&ts=" + Date.now();
            q += "&r=" + Math.random();
            q += "&plf=" + super_html_playable.channel_name();

            for (const k in data) {
                if (data.hasOwnProperty(k)) {
                    q +=
                        "&" +
                        encodeURIComponent(k) +
                        "=" +
                        encodeURIComponent(String(data[k]));
                }
            }

            const img = new Image();
            img.src = `${this.BASE_URL}?${q}`;

            setTimeout(() => {
                console.log("Have some :" + img.src);
            }, 1000);

        } catch (e) {
            console.error(e);
        }
    }

    private static isRunningLocal(): boolean {
        if (EDITOR) {
            return true;
        }

        try {
            if (typeof window === "undefined" || !window.location) {
                return false;
            }

            const protocol = window.location.protocol;
            const hostname = window.location.hostname?.toLowerCase() || "";

            if (protocol === "file:" || hostname.length === 0) {
                return true;
            }

            return hostname === "localhost" || hostname === "127.0.0.1";
        } catch {
            return false;
        }
    }
}
