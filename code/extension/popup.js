function getDataController() {
    if (chrome.extension) { // If in chrome extension mode
        return chrome.extension.getBackgroundPage().dataController;
    } else { // else Just browser page mode
        return new P2PController('key1', 'prvtk', 'http://localhost:8080');
    }
}

$(function () {
    let dataController = getDataController();
    console.log(dataController);
    $('form').submit(function () {
        let message = $('#send_input').val();
        dataController.saveData(message, 'key2');
        // Reset Value in input
        $('#send_input').val('');
        return false;
    });
    dataController.listenDataChanges(function (message) {
        $('#messages').append($('<li>').text(message));
    });
});