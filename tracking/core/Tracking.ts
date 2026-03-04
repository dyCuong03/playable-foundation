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

    private static getCampaignInfo(): string {
        const params = new URLSearchParams(window.location.search);

        const get = function (...keys: string[]) {
            for (let i = 0; i < keys.length; i++) {
                const value = params.get(keys[i]);
                if (value) return value;
            }
            return "";
        };

        // 🔥 Network detection ưu tiên plf hoặc channel_name
        const network =
            get("plf", "platform") ||
            (typeof super_html_playable !== "undefined" &&
                super_html_playable.channel_name &&
                super_html_playable.channel_name()) ||
            "unknown";

        // 🔥 Unified click id mapping (multi network)
        const unifiedClickId = get(
            "click_id",
            "clickid",
            "clid",
            "mtg_click_id",
            "ir_clickid",
            "gclid",
            "ttclid",
            "fbclid",
            "sc_click_id",
            "vungle_click_id",
            "moloco_click_id",
            "cb_click_id",
            "kwai_click_id",
            "pangle_click_id"
        );

        const result: any = {
            network: network,

            // campaign structure (unified mapping)
            campaign_id: get("campaign_id", "cid", "campaignid", "c_id"),
            campaign_name: get("campaign_name", "cname"),

            adgroup_id: get("adgroup_id", "agid", "adgroupid"),
            adgroup_name: get("adgroup_name", "agname"),

            creative_id: get("creative_id", "crid", "creativeid"),
            creative_name: get("creative_name", "crname"),

            placement_id: get("placement_id", "pid", "placementid"),
            placement_name: get("placement_name", "pname"),

            click_id: unifiedClickId,

            // attribution specific
            gclid: get("gclid"),
            ttclid: get("ttclid"),
            fbclid: get("fbclid"),

            // app info
            package_name: get("package_name", "bundle", "app_bundle", "pkg"),

            // device/context
            os: get("os"),
            os_version: get("os_version"),
            device_model: get("device_model"),
            country: get("country"),
            language: get("lang", "language")
        };

        // 🔥 Remove empty field để JSON gọn
        const cleanResult: any = {};
        for (const key in result) {
            if (result[key]) {
                cleanResult[key] = result[key];
            }
        }

        return JSON.stringify(cleanResult);
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
            q += "&plf=" + encodeURIComponent(super_html_playable.channel_name() || "unknown");
            q += "&camp=" + encodeURIComponent(this.getCampaignInfo());

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
