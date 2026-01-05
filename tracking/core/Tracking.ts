import { EDITOR } from 'cc/env';
import {constant} from "db://assets/configs/constant";
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
        if (EDITOR) {
            console.log('[Tracking][Editor]', event, data);
            return;
        }

        try {
            let q = "e=" + encodeURIComponent(event);
            q += "&pid=" + constant.TRACKING.PROJECT_ID;
            q += "&playable_id=" + constant.TRACKING.PLAYABLE_ID;
            q += "&sid=" + encodeURIComponent(this._sessionId);
            q += "&ref=" + encodeURIComponent(this._referer);
            q += "&ts=" + Date.now();
            q += "&r=" + Math.random();

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
}
