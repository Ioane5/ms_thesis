class P2PController {

	constructor(publicKey, privateKey, liveUrl, liveConfig) {
		this.publicKey = publicKey;
		this.privateKey = privateKey;
		this.liveController = LiveController(liveConfig);


		// Start listening to my connections
		this.liveController.createMyRoom();
		this.liveController.startListeningIncommingConnections();
	}

	sendMessage(message) {
		this.socket.emit('message', message);
	}

	onMessageReceived(messageCallback) {
		this.socket.on('message', function(msg){
			messageCallback(msg);
  		});
  	}

	toString() {
		return 'publicKey: ' + this.publicKey + ' privateKey: '+this.privateKey;
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
		    		'urls': ['stun:stun.l.google.com:19302',  'stun.2talk.co.nz:3478']
		  		}]
			};
		}
		this.connections = {};
	}

	createMyRoom(callback) {
		this.socket.emit('create_my_room', this.publicKey);
		this.socket.on('create_my_room_result', function(created, errorMessage) {
			callback(created);
			if (!created) {
				console.log('could not create room: ' + errorMessage)
			}
		});
	}

	startListeningIncommingConnections() {
		this.socket.on('connection_request', function(peerId) {
			createPeerConnection(false, this.liveConfig);
		});

		this.socket.on('signalling_message', function(message)) {
			onSignallingMessage(message);
		});
	}

	onSignallingMessage(message) {
		if (message.type === 'offer') {
	    	console.log('Got offer. Sending answer to peer.');
	    	this.peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {}, logError);
	    	this.peerConn.createAnswer(onLocalSessionCreated, logError);
		} else if (message.type === 'answer') {
			console.log('Got answer.');
		    this.peerConn.setRemoteDescription(new RTCSessionDescription(message), function() {}, logError);
		} else if (message.type === 'candidate') {
			this.peerConn.addIceCandidate(new RTCIceCandidate({ 
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
	sendSignallingMessage() {
	  this.socket.emit('signalling_message', message);
	}

	createPeerConnection(peerPublicKey, isInitiator, config) {
	  console.log('Creating Peer connection as initiator?', isInitiator, 'config:', config);
	  var peerConn = new RTCPeerConnection(config);

	  this.connections[peerPublicKey] = new Connection();
	  this.connections[peerPublicKey].peerConn = peerConn;

	  // send any ice candidates to the other peer
	  this.peerConn.onicecandidate = function(event) {
	    console.log('icecandidate event:', event);
	    if (event.candidate) {
	      sendMessage({
	        type: 'candidate',
	        label: event.candidate.sdpMLineIndex,
	        id: event.candidate.sdpMid,
	        candidate: event.candidate.candidate
	      });
	    } else {
	      console.log('End of candidates.');
	    }
	  };

	  if (isInitiator) {
	    console.log('Creating Data Channel');
	    dataChannel = this.peerConn.createDataChannel('photos');
	    onDataChannelCreated(dataChannel);

	    console.log('Creating an offer');
	    this.peerConn.createOffer(onLocalSessionCreated, logError);
	  } else {
	    this.peerConn.ondatachannel = function(event) {
	      console.log('ondatachannel:', event.channel);
	      dataChannel = event.channel;
	      onDataChannelCreated(dataChannel);
	    };
	  }
	}
}

class Connection {
	constructor(peerConn, dataChannel) {
		this.peerConn = peerConn;
		this.dataChannel = dataChannel;
	}
}

