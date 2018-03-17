$(function () {
    let dataController;

    function initDataController(publicKey, privateKey) {
        dataController.init(publicKey, privateKey, 'http://localhost:8080', null, onDataControllerAvailable);
    }

    function onDataControllerAvailable() {
        dataController.listenDataChanges((message) => {
            $('#messages').append($('<li>').text(message));
        });
    }

    function initialize() {
        dataController = new P2PControllerClient();
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
        dataController.saveData(message, sendTo);
        // Reset Value in input
        sendInput.val('');
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

    initialize();
});