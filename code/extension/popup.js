$(function () {
  var socket = io.connect('http://localhost:3000');
  $('form').submit(function(){
    socket.emit('message', $('#send_input').val());
    $('#send_input').val('');
    return false;
  });
  socket.on('message', function(msg){
    $('#messages').append($('<li>').text(msg));
  });
});