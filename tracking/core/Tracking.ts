import {EDITOR} from 'cc/env';
import {constant} from "db://assets/configs/constant";
import super_html_playable from "db://assets/plugins/playable-foundation/super-html/super_html_playable";

type CampaignPayload = Record<string, string>;

export class Tracking {
    private static readonly BASE_URL =
        "https://test.kyvuong.mobi/p.gif";

    private static _sessionId: string | null = null;
    private static _referer: string = Tracking.getReferer();
    private static _initialized = false;
    private static _cachedCampaignJson = "";
    private static _cachedCampaignPayload: CampaignPayload = {};
    private static _cachedPlatform = "";
    private static _firstTrackTimeMs = 0;

    static init() {
        if (this._initialized) {
            return;
        }

        const payload = this.collectCampaignInfo();
        this._cachedCampaignPayload = payload;
        this._cachedCampaignJson = JSON.stringify(payload);

        const preferredPlatform = this.safeChannelName();
        this._cachedPlatform = preferredPlatform || payload.network || "unknown";

        this._initialized = true;
    }

    private static ensureInitialized() {
        if (!this._initialized) {
            this.init();
        }
    }

    private static generateSessionId(): string {
        return (
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 10)
        );
    }

    private static getSessionId(): string {
        if (!this._sessionId) {
            this._sessionId = Tracking.generateSessionId();
        }
        return this._sessionId;
    }

    private static getReferer(): string {
        try {
            return document.referrer || "";
        } catch {
            return "";
        }
    }

    private static safeChannelName(): string {
        try {
            return super_html_playable.channel_name() || "";
        } catch {
            return "";
        }
    }

    private static getCampaignInfo(): string {
        this.ensureInitialized();
        return this._cachedCampaignJson;
    }

    private static collectCampaignInfo(): CampaignPayload {
        if (typeof window === "undefined" || !window.location) {
            return {};
        }

        const params = this.parseLocationSearch(window.location.search || "");

        const get = function (...keys: string[]) {
            for (let i = 0; i < keys.length; i++) {
                const value = params[keys[i]];
                if (value) return value;
            }
            return "";
        };

        const network =
            get("plf", "platform") ||
            this.safeChannelName() ||
            "unknown";

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

        const result: CampaignPayload = {
            network: network,
            campaign_id: get("campaign_id", "cid", "campaignid", "c_id"),
            campaign_name: get("campaign_name", "cname"),
            adgroup_id: get("adgroup_id", "agid", "adgroupid"),
            adgroup_name: get("adgroup_name", "agname"),
            creative_id: get("creative_id", "crid", "creativeid"),
            creative_name: get("creative_name", "crname"),
            placement_id: get("placement_id", "pid", "placementid"),
            placement_name: get("placement_name", "pname"),
            click_id: unifiedClickId,
            gclid: get("gclid"),
            ttclid: get("ttclid"),
            fbclid: get("fbclid"),
            package_name: get("package_name", "bundle", "app_bundle", "pkg"),
            os: get("os"),
            os_version: get("os_version"),
            device_model: get("device_model"),
            country: get("country"),
            language: get("lang", "language")
        };

        const cleanResult: CampaignPayload = {};
        for (const key in result) {
            if (result[key]) {
                cleanResult[key] = result[key];
            }
        }

        return cleanResult;
    }

    private static parseLocationSearch(search: string): CampaignPayload {
        const result: CampaignPayload = {};
        const normalizedSearch = search.startsWith("?") ? search.slice(1) : search;

        if (!normalizedSearch) {
            return result;
        }

        const pairs = normalizedSearch.split("&");
        for (let i = 0; i < pairs.length; i++) {
            const pair = pairs[i];
            if (!pair) {
                continue;
            }

            const separatorIndex = pair.indexOf("=");
            const rawKey = separatorIndex >= 0 ? pair.slice(0, separatorIndex) : pair;
            const rawValue = separatorIndex >= 0 ? pair.slice(separatorIndex + 1) : "";
            const key = this.decodeQueryValue(rawKey);

            if (!key || Object.prototype.hasOwnProperty.call(result, key)) {
                continue;
            }

            result[key] = this.decodeQueryValue(rawValue);
        }

        return result;
    }

    private static decodeQueryValue(value: string): string {
        if (!value) {
            return "";
        }

        const normalizedValue = value.replace(/\+/g, " ");
        try {
            return decodeURIComponent(normalizedValue);
        } catch {
            return normalizedValue;
        }
    }

    static trackByURI(event: string, data: any = {}) {
        this.ensureInitialized();

        const isLocal = this.isRunningLocal();
        const sessionId = this.getSessionId();

        if (!this.canTrackByDuration()) {
            return;
        }

        if (EDITOR || isLocal) {
            console.log("[Tracking][Event]", {
                event,
                sid: sessionId,
                mode: EDITOR ? "editor" : "local",
                data,
            });
            return;
        }

        try {
            const mergedData: Record<string, unknown> = {
                ...this._cachedCampaignPayload,
                ...data,
            };

            let q = "e=" + encodeURIComponent(event);
            q += "&pid=" + constant.TRACKING.PACKAGE_NAME;
            q += "&playable_id=" + constant.TRACKING.PLAYABLE_ID;
            q += "&sid=" + encodeURIComponent(sessionId);
            q += "&ref=" + encodeURIComponent(this._referer);
            q += "&ts=" + Date.now();
            q += "&r=" + Math.random();
            q += "&plf=" + encodeURIComponent(this._cachedPlatform);

            const camp = this.getCampaignInfo();
            if (camp) {
                q += "&camp=" + encodeURIComponent(camp);
            }

            for (const k in mergedData) {
                if (Object.prototype.hasOwnProperty.call(mergedData, k)) {
                    q +=
                        "&" +
                        encodeURIComponent(k) +
                        "=" +
                        encodeURIComponent(String(mergedData[k]));
                }
            }

            const img = new Image();
            img.src = `${this.BASE_URL}?${q}`;

            setTimeout(() => {
                console.log("[Tracking][Event]", {
                    event,
                    sid: sessionId,
                    mode: "remote",
                    url: img.src,
                });
            }, 500);

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

    private static canTrackByDuration(): boolean {
        const maxDurationMs = this.getMaxTrackingDurationMs();
        if (maxDurationMs <= 0) {
            return true;
        }

        if (this._firstTrackTimeMs <= 0) {
            this._firstTrackTimeMs = Date.now();
            return true;
        }

        const elapsedMs = Date.now() - this._firstTrackTimeMs;
        return elapsedMs <= maxDurationMs;
    }

    private static getMaxTrackingDurationMs(): number {
        const configuredSeconds = constant.TRACKING.MAX_TRACKING_DURATION_SEC;
        if (Number.isFinite(configuredSeconds) && configuredSeconds > 0) {
            return configuredSeconds * 1000;
        }

        return 60 * 1000;
    }
}
