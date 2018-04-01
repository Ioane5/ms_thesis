$(function () {
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
                openSettingsModal();
            }
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
        let sendTo = $('#peer_public_key').val();
        let message = sendInput.val();
        dataController.saveData({
            'key': conversationId(),
            'message': message,
        }, sendTo, (success) => {
            onConversationChange();
        });
        // Reset Value in input
        sendInput.val('');
    }

    function conversationId() {
        let publicKey = $('#public_key').val();
        let peerPublicKey = $('#peer_public_key').val();
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
                let publicKey = $('#public_key').val();
                let privateKey = $('#private_key').val();

                if (publicKey && privateKey) {
                    initDataController(publicKey, privateKey);
                } else {
                    openSettingsModal();
                }
            }
        }
    );

    function onConversationChange() {
        console.log("onConversationChange");
        dataController.getByKey(conversationId(), (conversation) => {
            console.log(conversation);
            let messageContainer = $('#messages');
            messageContainer.empty();
            if (conversation) {
                conversation.forEach((elem) => {
                    messageContainer.append($('<li>').text(elem.message));
                });
            }
        });
    }

    $('#peer_public_key').on('input', function (e) {
        let currentVal = $(this).val();
        let lastVal = $(this).data('lastval');
        // noinspection EqualityComparisonWithCoercionJS
        if (lastVal != currentVal) {
            $(this).data('lastval', $(this).val());
            //change action
            onConversationChange($(this).val());
        }
    });

    initialize();
});