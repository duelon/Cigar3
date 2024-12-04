export function getWsConnectString(addr, authKey = '') {
    const secure = 'https:' === window.location.protocol || addr.indexOf(':443') >= 0;
    const protocol = secure ? "wss" : "ws";
    const authKeyParam = authKey ? `?authToken=${encodeURIComponent(authKey)}` : '';
    const wsConnectString = `${protocol}://${addr}${authKeyParam}`;
    return wsConnectString;
}
