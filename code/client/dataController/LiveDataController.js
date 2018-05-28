import io from "socket.io-client";

export default class LiveDataController {

    constructor(publicKey, privateKey, url, config) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        console.log('LiveController connecting to: ' + url);
        this.socket = io.connect(url);
        if (config) {
            this.config = config;
        } else {
            this.config = {
                'iceServers': [{
                    'urls': ['stun:stun.l.google.com:19302', 'stun:stun.2talk.co.nz:3478']
                }]
            };
        }
        this.connections = {};

        this.createMyRoom();
    }

    onMessageReceived(callback) {
        this.messageCallback = callback;
    }

    createMyRoom() {
        this.socket.emit('enter_my_room', new Message(this.publicKey, null, null));
        this.socket.on('enter_my_room', (success) => {
            this.status = success;
            console.log('enter_my_room ' + success);
            if (success) {
                this.startListeningIncomingConnections();
            } else {
                this.onError('could not create room:');
            }
        });
        this.socket.on('error', (message) => {
            console.log('Error! : ', message);
            if (message && message.toPublicKey) {
                this.onSignallingError(message.toPublicKey);
            }
        });
    }

    sendData(data, recipient, callback) {
        data = JSON.stringify(data);
        if (this.status) {
            let connection = this.connections[recipient];
            if (connection) {
                connection.callback = callback;
                this.sendDataToConnection(data, connection)
            } else {
                this.socket.emit('connection_request', new Message(this.publicKey, recipient, null));
                this.createPeerConnection(recipient, true, (connection) => {
                    if (connection) {
                        connection.callback = callback;
                        this.sendDataToConnection(data, connection)
                    } else {
                        callback(false);
                    }
                })
            }
        } else {
            callback(false);
        }
    }

    sendDataToConnection(data, connection) {
        try {
            connection.dataChannel.send(data);
            connection.callback(true);
        } catch (e) {
            this.onSignallingError(connection.peerPublicKey);
        }
        connection.callback = null;
    }

    startListeningIncomingConnections() {
        this.socket.on('connection_request', (message) => {
            console.log('got connection_request: ' + message);
            this.createPeerConnection(message.fromPublicKey, false);
        });

        this.socket.on('signalling_message', (message) => {
            console.log('got signalling_message: ', message);
            if (this.connections[message.fromPublicKey]) {
                this.onSignallingMessage(message.fromPublicKey, message.data);
            } else {
                console.log('cloud not find connection', this.connections);
                this.onSignallingError(message.fromPublicKey);
            }
        });
    }

    onSignallingMessage(peerPublicKey, message) {
        let peerConn = this.connections[peerPublicKey].peerConn;
        if (message.type === 'offer') {
            console.log('Got offer. Sending answer to peer.');
            peerConn.setRemoteDescription(new RTCSessionDescription(message), () => {
            }, () => {
                this.onSignallingError(peerPublicKey)
            });
            peerConn.createAnswer((descr) => {
                this.onLocalSessionCreated(peerPublicKey, descr)
            }, () => {
                this.onSignallingError(peerPublicKey)
            });
        } else if (message.type === 'answer') {
            console.log('Got answer.');
            peerConn.setRemoteDescription(new RTCSessionDescription(message), () => {
            }, () => {
                this.onSignallingError(peerPublicKey)
            });
        } else if (message.type === 'candidate') {
            peerConn.addIceCandidate(new RTCIceCandidate({
                candidate: message.candidate
            }));
        } else if (message === 'bye') {
            // TODO: cleanup RTC connection?
        }
    }

    /**
     * Those messages are helpers for our application to set up connections properly,
     * No data messages are sent via Socket.io, just connection establishment
     */
    sendSignallingMessage(recipientPublicKey, message) {
        this.socket.emit('signalling_message', new Message(this.publicKey, recipientPublicKey, message));
    }

    createPeerConnection(peerPublicKey, isInitiator, callback) {
        console.log('Creating Peer connection as initiator?' + isInitiator + 'config:' + this.config);
        let peerConnection = new RTCPeerConnection(this.config);
        this.connections[peerPublicKey] = new Connection(peerConnection, null, callback, peerPublicKey);
        // send any ice candidates to the other peer
        peerConnection.onicecandidate = (event) => {
            console.log('icecandidate event:', event);
            if (event.candidate) {
                this.sendSignallingMessage(peerPublicKey, {
                    type: 'candidate',
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                });
            } else {
                console.log('End of candidates.' + peerConnection.iceConnectionState);
            }
        };
        peerConnection.oniceconnectionstatechange = (event) => {
            if (peerConnection.iceConnectionState == 'failed') {
                this.onSignallingError(peerPublicKey);
            }
        };
        if (isInitiator) {
            console.log('Creating Data Channel');
            this.connections[peerPublicKey].dataChannel = peerConnection.createDataChannel('data');
            this.onDataChannelCreated(this.connections[peerPublicKey]);

            console.log('Creating an offer');
            peerConnection.createOffer((desc) => {
                this.onLocalSessionCreated(peerPublicKey, desc);
            }, () => {
                this.onSignallingError(peerPublicKey)
            });
        } else {
            peerConnection.ondatachannel = (event) => {
                console.log('ondatachannel:', event.channel);
                this.connections[peerPublicKey].dataChannel = event.channel;
                this.onDataChannelCreated(this.connections[peerPublicKey]);
            };
        }
    }

    onLocalSessionCreated(peerPublicKey, desc) {
        let connection = this.connections[peerPublicKey];
        let peerConn = connection.peerConn
        console.log('local session created:', desc);
        peerConn.setLocalDescription(desc, () => {
            console.log('sending local desc:', peerConn.localDescription);
            this.sendSignallingMessage(peerPublicKey, peerConn.localDescription);
        }, () => {
            this.onSignallingError(peerPublicKey)
        });
    }

    onDataChannelCreated(connection) {
        console.log('onDataChannelCreated:', connection.dataChannel);
        connection.dataChannel.onopen = () => {
            console.log('CHANNEL opened!!!');
            if (connection.callback) {
                connection.callback(connection);
            }
        };
        connection.dataChannel.onmessage = (event) => {
            console.log('dataChannel onMessage', event.data);
            if (event.data) {
                let data = JSON.parse(event.data);
                console.log('received data ', data);
                this.onDataReceived(data);
            }
        };
    }

    onDataReceived(message) {
        if (this.messageCallback) {
            this.messageCallback(message);
        } else {
            console.log('Message listener is not set');
        }
    }

    onError(errorMsg) {
        console.log(errorMsg);
    }

    onSignallingError(publicKey) {
        console.log('signalling error ', publicKey, this.connections[publicKey]);
        if (this.connections[publicKey]) {
            try {
                let conn = this.connections[publicKey];
                if (conn.callback) {
                    conn.callback(null);
                }
                delete this.connections[publicKey];
                conn.peerConn.close();
                conn.dataChannel.close();
            } catch (e) {
                console.log('Could not process Signalling Error', e);
            }
        }
    }
}

class Connection {
    constructor(peerConn, dataChannel, callback, peerPublicKey) {
        this.peerConn = peerConn;
        this.dataChannel = dataChannel;
        this.callback = callback;
        this.peerPublicKey = peerPublicKey;
    }
}

class Message {
    constructor(fromPublicKey, toPublicKey, data) {
        this.fromPublicKey = fromPublicKey;
        this.toPublicKey = toPublicKey;
        this.data = data;
    }
}