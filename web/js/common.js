export function getWsConnectString(addr, authKey = '') {
    const secure = 'https:' === window.location.protocol || addr.indexOf(':443') >= 0;
    const protocol = secure ? "wss" : "ws";
    const authKeyParam = authKey ? `?auth_token=${encodeURIComponent(authKey)}` : '';
    return `${protocol}://${addr}${authKeyParam}`;
}
