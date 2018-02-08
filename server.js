'use strict';

var bodyParser = require('body-parser');
const express = require('express');
const path = require('path');

const PORT = process.env.PORT || 3000;
const INDEX = path.join(__dirname, 'index.html');

var app = express();

app.use(function(req, res, next) {
        res.header("Access-Control-Allow-Origin", "*");
        res.header("Access-Control-Allow-Headers", "X-Requested-With");
        res.header("Access-Control-Allow-Headers", "Content-Type");
        res.header("Access-Control-Allow-Methods", "PUT, GET, POST, DELETE, OPTIONS");
        next();
});

app.use(express.static(__dirname))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({extended:false}))

var http = require('http').Server(app)
var io = require('socket.io')(http)
var mongoose = require('mongoose')



mongoose.Promise = Promise;// used to override mongoose version of promise with updated es6 version

var dbUrl = 'mongodb://richardc:waterlevel@ds225308.mlab.com:25308/waterlevel'

var Message = mongoose.model('Message', {
    level: String,
    temp: String,
    date:String
})

mongoose.connect(dbUrl, (err) => {
    console.log('mongo db connection', err)
})

app.get('/messages', (req,res) =>{
    Message.find({}, (err, messages) => {
        res.send(messages)
    }) 
})

app.get('/last24', (req,res) =>{
    Message.find({}, (err, messages) => {
        res.send(messages)
    }).sort('-_id').limit(480); // 24 hours will 480 request at 5 minute intervals
})


app.post('/messages', async (req,res) =>{
    
    console.log("request is");
    console.log(req.body);
    
    try {
        var message = new Message(req.body)
        message.date = new Date();
        console.log(message.date);
        
        if (!message.level){
            return console.error("no level value");
        } else{
            var savedMessage = await message.save()
            console.log("saved")
            io.emit('message', message)
            res.sendStatus(200); // 200 is ok
        }        
        

    } catch (error) {
        res.sendStatus(500);
        return console.error(error)
    }

})


io.on('connection', (socket) => {
  console.log('Client connected');
  socket.on('disconnect', () => console.log('Client disconnected'));
});

setInterval(() => io.emit('time', new Date().toTimeString()), 1000);

var server = http.listen(PORT, () => console.log(`Listening on ${ PORT }`));
