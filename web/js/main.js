import Network from "./Network.js"
import Application from "./Application.js"
import Storage from "./Storage.js"
import UserInterface from "./UserInterface.js"
import Settings from "./Settings.js"
import {getWsConnectString} from "./common.js";
import {decodeJwtToken} from "./jwt-decode.js";

Array.prototype.remove = function (a) {
    const i = this.indexOf(a);
    return i !== -1 && this.splice(i, 1);
}

class Cigar3 {
    constructor() {
        this.init()
    }

    async init() {
        this.app = new Application(this);
        await this.app.loadInfos();
        this.store = new Storage();
        this.ui = new UserInterface(this);

        this.settings = new Settings(this);
        this.net = new Network(this);

        const params = new URLSearchParams(window.location.search);

        if (!params.has('authToken')) {
            console.error('No authToken provided. Please add ?authToken=your_token to the URL.');
            return;
        }
        this.store.authToken = params.get('authToken');
        this.net.connect(getWsConnectString(Object.keys(this.app.servers)[0]), this.store.authToken);
        const decoded = decodeJwtToken(this.store.authToken);
        // TODO: to be changed with user name from TG thwn it will be present in token
        if (decoded && decoded.telegram_user_id) {
            this.store.name = decoded.telegram_user_id;
        } else {
            this.store.name = 'Unnamed';
            console.error('Invalid or missing telegram_user_id in token');
        }
    }
}

window.CORE = new Cigar3()
