import {EDITOR} from 'cc/env';
import {constant} from "db://assets/configs/constant";
import {sys} from 'cc';
import super_html_playable from "db://assets/plugins/playable-foundation/super-html/super_html_playable";

type CampaignPayload = Record<string, string>;

export class Tracking {
    private static _sessionId: string | null = null;
    private static _referer: string = Tracking.getReferer();
    private static _initialized = false;
    private static _cachedCampaignJson = "";
    private static _cachedCampaignPayload: CampaignPayload = {};
    private static _cachedPlatform = "";
    private static _firstTrackTimeMs = 0;
    private static _inFlightImages = new Set<HTMLImageElement>();

    static init() {
        if (this._initialized) {
            return;
        }

        const payload = this.collectCampaignInfo();
        this._cachedCampaignPayload = payload;
        this._cachedCampaignJson = JSON.stringify(payload);

        // Platform is the real device OS (Windows | Android | IOS) — NOT the
        // ad-network name. Never fall back to channel/network here.
        this._cachedPlatform = this.resolvePlatform();

        this._initialized = true;
    }

    private static ensureInitialized() {
        if (!this._initialized) {
            this.init();
        }
    }

    static resetSession() {
        this._sessionId = null;
        this._firstTrackTimeMs = 0;
    }

    private static generateSessionId(): string {
        try {
            if (typeof crypto !== "undefined") {
                if (typeof crypto.randomUUID === "function") {
                    return crypto.randomUUID();
                }
                if (typeof crypto.getRandomValues === "function") {
                    const bytes = new Uint8Array(16);
                    crypto.getRandomValues(bytes);
                    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
                    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
                    const hex = Array.from(bytes, (b) => Tracking.toPaddedHexByte(b)).join("");
                    return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
                }
            }
        } catch {
            // fall through to timestamp fallback
        }
        // Last-resort fallback (non-crypto, but session still resets each game start)
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }

    private static toPaddedHexByte(value: number): string {
        const hex = value.toString(16);
        return hex.length === 1 ? "0" + hex : hex;
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

    static getPlatform(): string {
        this.ensureInitialized();
        return this._cachedPlatform;
    }

    static getCampaignJson(): string {
        this.ensureInitialized();
        return this._cachedCampaignJson;
    }

    static getCampaignPayload(): CampaignPayload {
        this.ensureInitialized();
        return this._cachedCampaignPayload;
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
            q += "&ts=" + new Date().toISOString();
            q += "&r=" + Math.random();
            q += "&plf=" + encodeURIComponent(this.resolvePlatform());

            if (this._cachedCampaignJson && this._cachedCampaignJson !== "{}") {
                q += "&camp=" + encodeURIComponent(this._cachedCampaignJson);
            } else {
                const safeChannelName = this.safeChannelName();
                if (safeChannelName) {
                    const camp = JSON.stringify({ network: safeChannelName });
                    q += "&camp=" + encodeURIComponent(camp);
                }
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

            const envValue = constant.TRACKING.ENV === "production" ? "production" : "test";
            q += "&env=" + encodeURIComponent(envValue);

            this.sendTrackingRequest(q);
        } catch (e) {
            console.error(e);
        }
    }

    private static sendTrackingRequest(queryString: string) {
        const url = `${this.getBaseUrl()}?${queryString}`;

        if (this.trySendWithFetch(url)) {
            return;
        }

        this.sendWithImage(url);
    }

    private static trySendWithFetch(url: string): boolean {
        try {
            if (typeof window === "undefined" || typeof window.fetch !== "function") {
                return false;
            }

            void window.fetch(url, {
                method: "GET",
                mode: "no-cors",
                cache: "no-store",
                keepalive: true,
                credentials: "omit",
            }).catch(() => {
                this.sendWithImage(url);
            });

            return true;
        } catch {
            return false;
        }
    }

    private static sendWithImage(url: string) {
        const img = new Image();
        const cleanup = () => {
            img.onload = null;
            img.onerror = null;
            this._inFlightImages.delete(img);
        };

        img.onload = cleanup;
        img.onerror = cleanup;

        this._inFlightImages.add(img);
        img.src = url;

        window.setTimeout(cleanup, 10_000);
    }

    private static resolvePlatform(): string {
        const fromSys = String(sys.os || "").trim();
        if (fromSys) {
            return this.normalizePlatform(fromSys);
        }

        // Fall back to OS hints in the URL params (never the network/channel name).
        const fromCampaign = (
            this._cachedCampaignPayload.plf ||
            this._cachedCampaignPayload.platform ||
            this._cachedCampaignPayload.os ||
            this._cachedPlatform ||
            ""
        ).trim();

        return this.normalizePlatform(fromCampaign);
    }

    // Map any raw OS string to the server's accepted enum: Windows | Android | IOS.
    // Desktop/unknown collapses to Windows (the only valid desktop bucket).
    private static normalizePlatform(raw: string): string {
        const v = String(raw || "").trim().toLowerCase();
        if (v.indexOf("android") >= 0) {
            return "Android";
        }
        if (v.indexOf("ios") >= 0 || v.indexOf("iphone") >= 0 || v.indexOf("ipad") >= 0) {
            return "IOS";
        }
        return "Windows";
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

    private static getBaseUrl(): string {
        return "https://id.archergame.mobi/p.gif";
    }
}
