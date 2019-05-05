import { EventEmitter } from "events";
import queryString from 'query-string';
import { randId, fileMeta } from "../util";
import io from 'socket.io-client';
const socketioConnections = 'https://api.esstudio.site/api/file-sharing/no-persist-open-chat';

const query = queryString.parse(window.location.search);

class FileStore extends EventEmitter {

    constructor() {
        super();
        if (query.id) {
            this.id = query.id;
        } else {
            this.id = randId();
            if (window.history && window.history.pushState) {
                window.history.replaceState(null, '', '?id=' + this.id);
            }
        }
        let localStorageId = false;
        try {
            localStorageId = localStorage.getItem('file-share-id');
        } catch (err) {
            console.error(err);
        }
        if (localStorageId) {
            this.user = localStorageId;
        } else {
            this.user = randId();
            try {
                localStorage.setItem('file-share-id', this.user);
            } catch (err) {
                console.error(err);
            }
        }

        console.log('userid', this.user);

        this.init();
    }

    init = () => {
        if (this.socket) this.socket.disconnect();
        this.socket = io.connect(socketioConnections, { 'connect timeout': 5000 });
        this.socket.on('connect', this.handleSocketConnect);
        this.socket.on('connect_error', this.handleConnectError);
    }

    changeRoom = id => {
        this.id = id;
        console.log('change page', id);
        this.init();
        if (window.history) {
            window.history.replaceState(null, '', '?id=' + this.id);
        }
    }

    files = [];
    users = [];

    handleConnectError = () => {
        alert('Connection failed');
    }

    handleSocketInitSuccess = isSuccess => {
        if (!isSuccess) return console.error('Unable to connect');

        this.socket.on('msg', this.handleMessage);

        this.socket.on('disconnected', data => {
            console.log('disconnect', data);
            delete this.users[data.from];
            const changed = this.files.some(file => file.user === data.from);
            if (changed) {
                this.files = this.files.filter(file => file.user !== data.from);
                this.emit('change');
            }
        });

        this.socket.emit('msg', { type: 'GET_FILES' });
    }

    downloadFiles = files => {
        files = files.filter(x => !x.downloaded && !x.downloading);
        if (files.length === 0) return;
        this.socket.emit('msg', { type: 'DOWNLOAD_FILES', payload: files.map(x => fileMeta(x)) });
        this.files = this.files.map(x => files.some(f => f.name === x.name) ? Object.assign(x, { downloading: true }) : x);
        console.log(this.files);
        this.emit('change');
    }

    handleMessage = (data, fn) => {
        console.log('handle message', data);
        if (data.to && data.to !== this.user) return;
        switch(data.type) {
            case 'GET_FILES': {
                this.socket.emit('msg', { type: 'ADD_FILES', to: data.from, payload: this.files.filter(file => file.user === this.user) });
                break;
            }
            case 'ADD_FILES': {
                this.files.push(...data.payload.map(file => ({ ...file, downloaded: false, downloading: false, user: data.from })))
                break;
            }
            case 'DOWNLOAD_FILES': {
                console.log(this.files, data.payload);
                const files = this.files.filter(file => data.payload.some(f => f.name === file.name ) && file.user === this.user);
                console.log(files);
                this.socket.emit('msg', { type: 'SEND_FILES', to: data.from, payload: files })
                break;
            }
            case 'SEND_FILES': {
                this.files = this.files.map(myFile => Object.assign(data.payload.find(otherFile => myFile.name === otherFile.name) || myFile, { downloading: false }));
                break;
            }
            default: return;
        }
        this.emit('change');
    }

    handleSocketConnect = () => {
        this.socket.emit('init', { room: this.id, nickname: this.user }, this.handleSocketInitSuccess);
        this.socket.on('disconnect', () => { console.warn(' socket disconnect'); });
    }

    addFiles = files => {
        this.files.push(...files);
        this.socket.emit('msg', ({ type: 'ADD_FILES', payload: files.map(f => fileMeta(f)) }));
        this.emit('change');
    }

    removeFile = blob => {
        const index = this.files.indexOf(blob);
        if (index !== -1) {
            this.files.splice(index, 1);
        }
        this.emit('change');
    }
}

export default new FileStore();
