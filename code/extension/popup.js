$(function () {
    let dataController;
    if (chrome.extension) { // If in chrome extension mode
        dataController = chrome.extension.getBackgroundPage().dataController;
    } else { // else Just browser page mode
        dataController = new P2PController('key1', 'prvtk', 'http://localhost:3000');
    }
    console.log(dataController);
    $('form').submit(function () {
        let message = $('#send_input').val();
        dataController.saveData(message, 'some peer id?');
        // Reset Value in input
        $('#send_input').val('');
        return false;
    });
    dataController.listenDataChanges(function (message) {
        $('#messages').append($('<li>').text(message));
    });
});