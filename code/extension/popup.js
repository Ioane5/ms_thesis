$(function () {
  var dataController = chrome.extension.getBackgroundPage().dataController;
  console.log(dataController);
  $('form').submit(function(){
    var message = $('#send_input').val();
    dataController.sendMessage(message);
    // Reset Value in input
    $('#send_input').val('');
    return false;
  });
  dataController.onMessageReceived(function(msg) {
    $('#messages').append($('<li>').text(msg));
  });
});