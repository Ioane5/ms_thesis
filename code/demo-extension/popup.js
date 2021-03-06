$(function () {

    function getLocalStorage() {
        return window.localStorage
    }

    if (chrome.extension) {
        let body = $('body');
        body.height(500);
        body.width(400);
    }
    let dataController;

    function initDataController(publicKey, privateKey) {
        dataController.init(publicKey, privateKey, 'https://live-rooms.herokuapp.com/', null, onDataControllerAvailable, 'https://message-box2.herokuapp.com', 1);
    }

    function onDataControllerAvailable() {
        dataController.listenDataChanges(() => {
            onConversationChange();
        });
    }

    function initialize() {
        dataController = new DataControllerClient();
        dataController.isInitialized((data) => {
            if (data) {
                fillSettings(data.publicKey, data.privateKey);
                onDataControllerAvailable();
            } else {
                let localStorage = getLocalStorage();
                let publicKey = localStorage.getItem('publicKey');
                let privateKey = localStorage.getItem('privateKey');
                // Fill values from cache
                if (publicKey && privateKey) {
                    fillSettings(publicKey, privateKey);
                    initDataController(publicKey, privateKey);
                } else {
                    openSettingsModal();
                }
            }
            let localStorage = getLocalStorage();
            let lastPeer = localStorage.getItem('lastPeer');
            $('#peer_public_key').val(lastPeer);
        });
    }

    /**
     * Fills settings with Public and private keys
     */
    function fillSettings(publicKey, privateKey) {
        $('#public_key').val(publicKey);
        $('#private_key').val(privateKey);
    }

    $('#send_input').keypress(function (event) {
        let keycode = event.keyCode || event.which;
        // noinspection EqualityComparisonWithCoercionJS
        if (keycode.toString() == "13") {
            sendMessage();
        }
    });

    $('#send_button').click(() => {
        sendMessage();
        return false;
    });

    function sendMessage() {
        let sendInput = $('#send_input');
        let sendTo = $('#peer_public_key').val().replace(/\s/g, "") ;
        let message = sendInput.val();
        // Reset Value in input
        sendInput.val('');
        // Choose correct function for data sharing.
        // In case of public data we publish.
        // If it's a peer2peer chat then we share it.
        let params = {
            'key': conversationId(),
            'message': message
        };
        let callback = (success) => {
            onConversationChange();
        };
        if (isPublicConversation()) {
            dataController.publish(params, callback);
        } else {
            dataController.saveData(params, sendTo, callback);
        }
    }

    function conversationId() {
        let publicKey = $('#public_key').val().replace(/\s/g, "");
        let peerPublicKey = $('#peer_public_key').val().replace(/\s/g, "");
        // To make all public conversations with same key, then we only use public  peer id
        if (isPublicConversation()) {
            return peerPublicKey;
        }
        // Always sorted, so that peers have same conversation id.
        if (publicKey > peerPublicKey) {
            return publicKey + peerPublicKey;
        } else {
            return peerPublicKey + publicKey;
        }
    }

    $('#settings_button').click(() => {
        openSettingsModal(true)
    });

    function openSettingsModal(cancellable) {
        let settingsModalDialog = $('#settings_modal');
        if (cancellable) {
            $('#cancel_settings_button').removeClass('disabled');
        } else {
            $('#cancel_settings_button').addClass('disabled');
        }
        // settingsModalDialog.modal();
        settingsModalDialog.modal('open');
    }

    $('#settings_modal').modal({
            dismissible: false, // Modal can be dismissed by clicking outside of the modal
            complete: function () {
                let publicKey = $('#public_key').val().replace(/\s/g, "");
                let privateKey = $('#private_key').val().replace(/\s/g, "");

                getLocalStorage().setItem('publicKey', publicKey);
                getLocalStorage().setItem('privateKey', privateKey);
                if (publicKey && privateKey) {
                    initDataController(publicKey, privateKey);
                } else {
                    openSettingsModal();
                }
            }
        }
    );

    /**
     * Returns true if Current Conversation is in public channel
     */
    function isPublicConversation() {
        let peerKey = $('#peer_public_key').val().replace(/\s/g, "");
        return peerKey.startsWith("_");
    }

    /**
     * Just reloads conversation
     */
    function onConversationChange() {
        console.log('onconversationchange', this.updateChatView);
        if (isPublicConversation()) {
            dataController.fetchPublicByKey(conversationId(), updateChatView);
        } else {
            dataController.getByKey(conversationId(), updateChatView);
        }
    }

    function updateChatView(conversation) {
        console.log('update chat', conversation);
        let messageContainer = $('#messages');
        messageContainer.empty();
        if (conversation) {
            conversation.forEach((elem) => {
                messageContainer.append($('<li>').text(elem.message));
            });
        }
    }

    $('#peer_public_key').on('input', function (e) {
        let currentVal = $(this).val().replace(/\s/g, "");
        let lastVal = $(this).data('lastval');
        // noinspection EqualityComparisonWithCoercionJS
        if (lastVal != currentVal) {
            $(this).data('lastval', currentVal);
            getLocalStorage().setItem('lastPeer', currentVal);
            //change action
            onConversationChange();
        }
    });

    initialize();
});