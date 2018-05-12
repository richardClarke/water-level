'use strict';

var Nexmo = require('./lib/Nexmo');
var config = require('./config.js');
var fs = require('fs');

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

var jsonData = JSON.parse(fs.readFileSync('settings.json', 'utf8'));

//console.log(jsonData.waterSettings.lowlevel);
//console.log(jsonData.waterSettings.sms);

///////SMS///////////
var smsStatus = jsonData.waterSettings.sms;
var SMSMessageNum = 0;
var SMSMessageDelay = 12; // assuming 1 update every 15 minutes delay sms to max 1 a day means resetting after 96
/////////////////////
var lowLevelWaterReading = jsonData.waterSettings.lowlevel;

mongoose.Promise = Promise;// used to override mongoose version of promise with updated es6 version


// data base url moved to heroku environmental variable
var dbUrl = config.MONGO_DB;
//console.log(config.MONGO_DB)


var Message = mongoose.model('Message', {
    level: String,
    temp: String,
    humidity: String,
    water: String,
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

app.get('/last12', (req,res) =>{
    Message.find().sort('-_id').limit(24).exec(function(err, messages){  //last 24 hours at 1 record every 15 minutes
        res.send(messages)
    });
})

app.post('/sms',  async (req,res) =>{
    var inStatus = req.body;
    console.log("updating SMS status to "+inStatus.status);
    
    smsStatus = inStatus.status;
    
    SMSMessageNum = 0; //reset sms delay
    
    jsonData.waterSettings.sms = smsStatus;
    var jsonWrite = JSON.stringify(jsonData);
    fs.writeFile('settings.json', jsonWrite, 'utf8', updatedJson);
    
    try {
        io.emit('sms', smsStatus);
        res.sendStatus(200); // 200 is ok
    } catch (error) { 
        res.sendStatus(500);
        return console.error(error)
    }

})



app.post('/waterLevel',  async (req,res) =>{
    var inData = req.body;
    console.log("updating low water level to "+inData.lowLevel);
    
    lowLevelWaterReading = inData.lowLevel;
    
    jsonData.waterSettings.lowlevel = lowLevelWaterReading;
    var jsonWrite = JSON.stringify(jsonData);
    fs.writeFile('settings.json', jsonWrite, 'utf8', updatedJson);
    
    try {
        io.emit('lowWater', lowLevelWaterReading); 
        res.sendStatus(200); // 200 is ok
    } catch (error) { 
        res.sendStatus(500);
        return console.error(error)
    }

})

app.post('/resetSMS',  async (req,res) =>{
    
    SMSMessageNum = 0;
    
    try {
        io.emit('smsReset', SMSMessageDelay); 
        res.sendStatus(200); // 200 is ok
    } catch (error) { 
        res.sendStatus(500);
        return console.error(error)
    }

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
            //var savedMessage = await message.save()
            console.log("saved")
            console.log("water level at "+message.level);
            console.log("temp outside "+message.temp);
            console.log("humidity "+message.humidity);
            console.log("water temp "+message.water);
            //console.log("sms =  "+smsStatus);
            //console.log("level = "+message.level)
           // console.log("low level = "+lowLevelWaterReading)
            
            if (parseInt(message.level) < lowLevelWaterReading){
                //console.log("met low level water criteria")
                if (smsStatus == 'Active'){
                    //console.log("sms status is active ");
                    if (SMSMessageNum == 0){
                        //console.log("sms MessageNum = 0");
                        nexmo.message.sendSms(config.FROM_NUMBER, config.TO_NUMBER, 'Water level now running low', sendResult); 
                        console.log("sms message sent");
                   }
                }
               
            } 
            
            if (parseInt(message.level) <= lowLevelWaterReading && smsStatus == 'Active'){
                SMSMessageNum++;
                io.emit('smsDelays', SMSMessageNum,SMSMessageDelay); 
                if (SMSMessageNum == SMSMessageDelay){SMSMessageNum = 0}; // used to stop constant sms messages
                
            }
            
            
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
  io.emit('sms', smsStatus);
  io.emit('lowWater', lowLevelWaterReading); 
  io.emit('smsDelays', SMSMessageNum,SMSMessageDelay);  
    
});

//setInterval(() => io.emit('time', new Date().toTimeString()), 1000);

//setInterval(() => io.emit('sms', smsStatus), 3000);

function updatedJson(){
    console.log("data updated");
}


function sendResult(err, res) {
   console.log('SMS Sent:', 'Nexmo Data', res);
}

var nexmo = new Nexmo({
   apiKey: config.API_KEY, 
   apiSecret: config.API_SECRET
},
  {debug: config.DEBUG}
);
  
 
//console.log(config.API_KEY);
//console.log(config.API_SECRET);

var server = http.listen(PORT, () => console.log(`Listening on ${ PORT }`));
