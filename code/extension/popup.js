$(function () {
    let dataController = undefined;

    function initDataController(publicKey, privateKey) {
        let newDataController = new P2PController(publicKey, privateKey, 'http://localhost:8080');
        if (chrome.extension) { // If in chrome extension mode
            chrome.extension.getBackgroundPage().dataController = newDataController;
        } else { // else Just browser page mode
            dataController = newDataController;
        }

        newDataController.listenDataChanges((message) => {
            $('#messages').append($('<li>').text(message));
        });
    }

    function getDataController() {
        if (chrome.extension) { // If in chrome extension mode
            return chrome.extension.getBackgroundPage().dataController;
        } else { // else Just browser page mode
            return dataController;
        }
    }

    function initialize() {
        if (getDataController()) {
            fillSettings();
        } else {
            openSettingsModal();
        }
    }

    /**
     * Fills settings with Public and private keys
     */
    function fillSettings() {
        let controller = getDataController();
        $('#public_key').val(controller.publicKey);
        $('#private_key').val(controller.privateKey);
    }

    $('#send_input').keypress(function (event) {
        var keycode = event.keyCode || event.which;
        if (keycode == '13') {
            sendMessage();
        }
    });

    $('#send_button').click(() => {
        sendMessage();
        return false;
    });

    function sendMessage() {
        let sendInput = $('#send_input');
        let message = sendInput.val();
        getDataController().saveData(message, $('#peer_public_key').val());
        // Reset Value in input
        sendInput.val('');
    }

    $('#settings_button').click(() => {
        openSettingsModal()
    });

    function openSettingsModal() {
        let settingsModalDialog = $('#settings_modal');
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