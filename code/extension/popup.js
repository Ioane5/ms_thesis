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

// document.addEventListener('DOMContentLoaded', () => {
//   // onStart();
// });


// function onStart() {
//   /* Connects to the socket server */
//   var socket = io.connect('http://localhost:3000');

//   socket.on('connect', function() {
//     console.log('Client connected');
//   });

//   socket.on('disconnect', function() {
//     console.log('Client connected');
//   });

//   socket.on('error', function (err) {
//     console.log('error: ' + err)
//   });

//   /* Setup form listener */
//   var sendForm = document.getElementById('send_form');
//   var sendInput = document.getElementById('send_input');
//   sendForm.addEventListener('submit', () => {
//       if (sendInput.value == '') { return } // Ignore Empty Messages
//       socket.emit('message', sendInput.value);
//       sendInput.value = '';
//       return true;
//   });

//   socket.on('message', function(msg) {
//     console.log(msg);
//     // var ul = document.getElementById('messages');
//     // var li = document.createElement("li");
//     // li.appendChild(document.createTextNode(msg));
//     // ul.appendChild(li);
//   });
// }