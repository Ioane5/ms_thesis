class P2PController {

    constructor(publicKey, privateKey, liveUrl, liveConfig) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.liveController = new LiveController(liveConfig);
        this.liveController.createMyRoom(function (message) {
            this.onDataReceived(message);
        });
    }

    query(key, callback) {
        // TODO make a query from local and public datastore.
    }

    saveData(data, sharedWith) {
        // TODO save data and share with peers
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

    constructor(publicKey, privateKey, url, liveConfig) {
        this.publicKey = publicKey;
        this.privateKey = privateKey;
        this.socket = io.connect(url);
        if (liveConfig) {
            this.liveConfig = liveConfig;
        } else {
            this.liveConfig = {
                'iceServers': [{
                    'urls': ['stun:stun.l.google.com:19302', 'stun.2talk.co.nz:3478']
                }]
            };
        }
        this.connections = {};
    }

    // Create my room and wait for incoming connections
    createMyRoom(callback) {
        this.messageCallback = callback;
        this.socket.emit('create_my_room', this.publicKey);
        this.socket.on('create_my_room_result', function (created, errorMessage) {
            if (created) {
                this.startListeningIncomingConnections();
            } else {
                console.log('could not create room: ' + errorMessage)
            }
        });
    }

    onMessageReceived(message) {
        if (this.messageCallback) {
            this.messageCallback(message);
        } else {
            console.log('Message listener is not set');
        }
    }

    startListeningIncomingConnections() {
        this.socket.on('connection_request', function (peerId) {
            this.createPeerConnection(false, this.liveConfig);
        });

        this.socket.on('signalling_message', function (message) {
            this.onSignallingMessage(message);
        });
    }

    onSignallingMessage(message) {
        let peerConn = this.connections[message.peerPublicKey];
        if (message.type === 'offer') {
            console.log('Got offer. Sending answer to peer.');
            peerConn.setRemoteDescription(new RTCSessionDescription(message), function () {
            }, this.onError);
            peerConn.createAnswer(function (descr) {
                descr.peerPublicKey = message.peerPublicKey;
                this.onLocalSessionCreated(descr)
            }, this.onError);
        } else if (message.type === 'answer') {
            console.log('Got answer.');
            peerConn.setRemoteDescription(new RTCSessionDescription(message), function () {
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
    sendSignallingMessage(message) {
        this.socket.emit('signalling_message', message);
    }

    createPeerConnection(peerPublicKey, isInitiator, config) {
        console.log('Creating Peer connection as initiator?', isInitiator, 'config:', config);
        let peerConnection = new RTCPeerConnection(config);
        this.connections[peerPublicKey] = new Connection(peerConnection, null);
        // send any ice candidates to the other peer
        this.connections[peerPublicKey].peerConn.onicecandidate = function (event) {
            console.log('icecandidate event:', event);
            if (event.candidate) {
                this.sendSignallingMessage({
                    type: 'candidate',
                    label: event.candidate.sdpMLineIndex,
                    id: event.candidate.sdpMid,
                    candidate: event.candidate.candidate,
                    peerPublicKey: peerPublicKey
                });
            } else {
                console.log('End of candidates.');
            }
        };

        if (isInitiator) {
            console.log('Creating Data Channel');
            this.connections[peerPublicKey].dataChannel = peerConnection.createDataChannel('data');
            this.onDataChannelCreated(this.connections[peerPublicKey].dataChannel);

            console.log('Creating an offer');
            peerConnection.createOffer(function (desc) {
                desc.peerPublicKey = peerPublicKey;
                this.onLocalSessionCreated(desc);
            }, this.onError);
        } else {
            peerConnection.ondatachannel = function (event) {
                console.log('ondatachannel:', event.channel);
                this.connections[peerPublicKey].dataChannel = event.channel;
                this.onDataChannelCreated(this.connections[peerPublicKey].dataChannel);
            };
        }
    }

    onLocalSessionCreated(desc) {
        let peerConn = this.connections[desc.peerPublicKey];
        console.log('local session created:', desc);
        peerConn.setLocalDescription(desc, function () {
            console.log('sending local desc:', peerConn.localDescription);
            this.sendSignallingMessage(peerConn.localDescription);
        }, this.onError);
    }

    onDataChannelCreated(channel) {
        console.log('onDataChannelCreated:', channel);
        channel.onopen = function () {
            console.log('CHANNEL opened!!!');
        };

        channel.onmessage = function (event) {
            console.log('received data ' + event.data);
            onMessageReceived(event.data);
        }
    }

    static onError(err) {
        console.log(err.toString(), err);
    }
}

class Connection {
    constructor(peerConn, dataChannel) {
        this.peerConn = peerConn;
        this.dataChannel = dataChannel;
    }
}

