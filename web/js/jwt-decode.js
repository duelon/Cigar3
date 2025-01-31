import * as jwt from 'jwtDecode';

export function decodeJwtToken(token) {
    return jwt.jwtDecode(token);
}
