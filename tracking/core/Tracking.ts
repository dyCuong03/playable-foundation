import { EDITOR } from 'cc/env';
export class Tracking {
    private static readonly BASE_URL =
        "https://test.kyvuong.mobi/p.gif";

    static trackByURI(event: string, data: any = {}) {
        if (EDITOR) {
            console.log('[Tracking][Editor]', event, data);
            return;
        }

        try {
            let q = "e=" + encodeURIComponent(event);
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
