function getDataController() {
    if (chrome.extension) { // If in chrome extension mode
        return chrome.extension.getBackgroundPage().dataController;
    } else { // else Just browser page mode
        return new P2PController('key1', 'prvtk', 'http://localhost:8080');
    }
}

$(function () {
    var dataController = undefined;
    $('#config_form').submit(() => {
        dataController = new P2PController($('#my_public_key').val(), $('#my_private_key').val(), 'http://localhost:8080');
        dataController.listenDataChanges((message) => {
            $('#messages').append($('<li>').text(message));
        });
        console.log('here we are');
        return false;
    });
    $('#send_form').submit(() => {
        let message = $('#send_input').val();
        dataController.saveData(message, $('#peer_public_key').val());
        // Reset Value in input
        $('#send_input').val('');
        return false;
    });
});