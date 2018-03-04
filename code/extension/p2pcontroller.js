class P2PController {

    constructor(publicKey, privateKey, liveUrl, liveConfig) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.liveController = new LiveController(publicKey, privateKey, liveUrl, liveConfig);
        this.liveController.onMessageReceived((message) => {
            this.onDataReceived(message);
        });
    }

    query(key, callback) {
        // TODO make a query from local and public datastore.
    }

    saveData(data, sharedWith) {
        try {


            // TODO save data and share with peers
            this.liveController.sendData(data, sharedWith, (success) => {
                console.log('sendData success: ' + success);
                if (!success) {
                    // TODO try with MessageBox
                }
            });
        } catch (e) {
            console.log(e);
        }
    }

    listenDataChanges(callback) {
        this.dataListener = callback;
    }

    onDataReceived(data) {
        if (this.dataListener) {
            this.dataListener(data);
            // TODO save in local store
        } else {
            console.log('data listener not set');
        }
    }

    toString() {
        return 'publicKey: ' + this.publicKey + ' privateKey: ' + this.privateKey;
    }
}

class LiveController {

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

    // Create my room and wait for incoming connections
    createMyRoom() {
        this.socket.emit('enter_my_room', this.publicKey);
        this.socket.on('enter_my_room', (success) => {
            this.status = success;
            console.log('enter_my_room ' + success);
            if (success) {
                this.startListeningIncomingConnections();
            } else {
                console.log('could not create room: ')
            }
        });
    }

    startListeningIncomingConnections() {
        this.socket.on('connection_request', (peerPublicKey) => {
            this.createPeerConnection(peerPublicKey, false);
        });

        this.socket.on('signalling_message', (message) => {
            this.onSignallingMessage(message);
        });
    }

    sendData(data, recipient, callback) {
        if (this.status) {
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

    onSignallingMessage(message) {
        let peerConn = this.connections[message.peerPublicKey];
        if (message.type === 'offer') {
            console.log('Got offer. Sending answer to peer.');
            peerConn.setRemoteDescription(new RTCSessionDescription(message), () => {
            }, this.onError);
            peerConn.createAnswer((descr) => {
                descr.peerPublicKey = message.peerPublicKey;
                this.onLocalSessionCreated(descr)
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
        this.socket.emit('signalling_message', recipientPublicKey, message);
    }

    createPeerConnection(peerPublicKey, isInitiator, callback) {
        console.log('Creating Peer connection as initiator?', isInitiator, 'config:', this.config);
        let peerConnection = new RTCPeerConnection(this.config);
        this.connections[peerPublicKey] = new Connection(peerConnection, null, callback);
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
                desc.peerPublicKey = peerPublicKey;
                this.onLocalSessionCreated(desc);
            }, this.onError);
        } else {
            peerConnection.ondatachannel = (event) => {
                console.log('ondatachannel:', event.channel);
                this.connections[peerPublicKey].dataChannel = event.channel;
                this.onDataChannelCreated(this.connections[peerPublicKey]);
            };
        }
    }

    onLocalSessionCreated(desc) {
        let connection = this.connections[desc.peerPublicKey];
        console.log('local session created:', desc);
        connection.peerConn.setLocalDescription(desc, () => {
            console.log('sending local desc:', connection.peerConn.localDescription);
            this.sendSignallingMessage(connection.peerPublicKey, connection.peerConn.localDescription);
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

    onError(err) {
        console.log(err.toString(), err);
    }
}

class Connection {
    constructor(peerConn, dataChannel, callback) {
        this.peerConn = peerConn;
        this.dataChannel = dataChannel;
        this.callback = callback;
    }
}