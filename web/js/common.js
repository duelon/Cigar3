export function getWsConnectString(addr) {
    const secure = 'https:' === window.location.protocol || addr.indexOf(':443') >= 0
    return `${secure ? "wss" : "ws"}://${addr}`
}