export function getWsConnectString(addr) {
    const secure = 'https:' === window.location.protocol || addr.indexOf(':443') >= 0;
    const protocol = secure ? "wss" : "ws";
    return `${protocol}://${addr}`
}
