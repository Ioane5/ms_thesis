class LiveDataController {

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
        // TODO
        this.createMyRoom();
    }

    onMessageReceived(callback) {
        this.messageCallback = callback;
    }

    createMyRoom() {
        this.socket.emit('create_my_room', Message(this.publicKey, null, null));
        this.socket.on('enter_my_room', (success) => {
            this.status = success;
            console.log('enter_my_room ' + success);
            if (success) {
                this.startListeningIncomingConnections();
            } else {
                this.onError('could not create room:');
            }
        });
    }

    sendData(data, recipient, callback) {
        if (this.status) {
            this.socket.emit('connection_request', Message(this.publicKey, recipient, null));
            this.createPeerConnection(recipient, true, (connection) => {
                if (connection && connection.dataChannel) {
                    connection.dataChannel.send(data);
                    callback(true);
                } else {
                    callback(false);
                }
            })
        } else {
            callback(false);
        }
    }

    startListeningIncomingConnections() {
        this.socket.on('connection_request', (message) => {
            console.log('got connection_request: ' + message);
            this.createPeerConnection(message.fromPublicKey, false);
        });

        this.socket.on('signalling_message', (message) => {
            console.log('got signalling_message: ' + message);
            this.onSignallingMessage(message.fromPublicKey, message.data);
        });
    }

    onSignallingMessage(peerPublicKey, message) {
        let peerConn = this.connections[peerPublicKey].peerConn;
        if (message.type === 'offer') {
            console.log('Got offer. Sending answer to peer.');
            peerConn.setRemoteDescription(new RTCSessionDescription(message), () => {
            }, this.onError);
            peerConn.createAnswer((descr) => {
                this.onLocalSessionCreated(peerPublicKey, descr)
            }, this.onError);
        } else if (message.type === 'answer') {
            console.log('Got answer.');
            peerConn.setRemoteDescription(new RTCSessionDescription(message), () => {
            }, this.onError);
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
        console.log('Creating Peer connection as initiator?', isInitiator, 'config:', this.config);
        let peerConnection = new RTCPeerConnection(this.config);
        this.connections[peerPublicKey] = new Connection(peerConnection, null, callback, peerPublicKey);
        // send any ice candidates to the other peer
        this.connections[peerPublicKey].peerConn.onicecandidate = (event) => {
            console.log('icecandidate event:', event);
            if (event.candidate) {
                this.sendSignallingMessage(peerPublicKey, {
                    type: 'candidate',
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                });
            } else {
                console.log('End of candidates.');
            }
        };

        if (isInitiator) {
            console.log('Creating Data Channel');
            this.connections[peerPublicKey].dataChannel = peerConnection.createDataChannel('data');
            this.onDataChannelCreated(this.connections[peerPublicKey]);

            console.log('Creating an offer');
            peerConnection.createOffer((desc) => {
                this.onLocalSessionCreated(peerPublicKey, desc);
            }, this.onError);
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
        }, this.onError);
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
            console.log('received data ' + event.data);
            this.onDataReceived(event.data);
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