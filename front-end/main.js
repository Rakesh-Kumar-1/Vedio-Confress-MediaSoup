import './src/style.css'
import buttons from './uiStuff/uiButtons'
import { io } from 'socket.io-client'
import { Device } from 'mediasoup-client'
import getMic2 from './getMic2'
import createProducerTransport from './mediaSoupFunctions/createProducerTransport'
import createProducer from './mediaSoupFunctions/createProducer'
import requestTransportToConsume from './mediaSoupFunctions/requestTransportToConsume'
//For local development remove 'https' and make 'http'
//const socket = io.connect('https://localhost:3031')


//Global variable
let device = null;
let localStream = null;
let producerTransport = null;
let videoProducer = null;
let audioProducer = null;
let consumers = {}  //key of audioPid
//Global variable


const socket = io.connect('http://localhost:3031')
socket.on('connect', () => {
    console.log("connected")
})

const joinRoom = async () => {
    const userName = document.getElementById('username').value
    const roomName = document.getElementById('room-input').value
    const joinRoomResp = await socket.emitWithAck('joinRoom', { userName, roomName })
    //console.log(joinRoomResp)
    device = new Device()
    await device.load({ routerRtpCapabilities: joinRoomResp.routerRtpCapabilities })
    console.log(device)

    //joinRoomResp contains arrays for:
        //audioPidsToCreate
        //mapped to videopidsToCreate
        //mapped to usernames
    //These arrays, may be empty... they may have a max of 5 indicies
    requestTransportToConsume(joinRoomResp,socket,device,consumers)

    //Start making transport for current
    buttons.control.classList.remove('d-none')

}
const enableFeed = async () => {
    const mic2Id = await getMic2() //This is for person's personal audio
    localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        //audio: true,
        audio: { deviceId: { exact: mic2Id } }, // this is for me!
    })
    buttons.localMediaLeft.srcObject = localStream;
    buttons.enableFeed.disabled = true
    buttons.sendFeed.disabled = false
    buttons.muteBtn.disabled = false
}
const sendFeed = async () => {
    //Create a transport fot this client's upstream
    //It will handle both audio and vedio producers
    producerTransport = await createProducerTransport(socket, device)
    //Create our producer
    const producers = await createProducer(localStream, producerTransport)
    audioProducer = producers.audioProducer
    videoProducer = producers.videoProducer
    buttons.hangUp.disabled = false
}

const muteAudio = () => {
    if (audioProducer.paused) {
        //currently paused.User wants to unpause
        audioProducer.resume()
        buttons.muteBtn.innerHTML = 'Audio On'
        buttons.muteBtn.classList.add('btn-success')
        buttons.muteBtn.classList.remove('btn-danger')
        //unpause on the server
        socket.emit('audioChange', 'unmute')
    } else {
        //currently on, User wants to pause
        audioProducer.pause()
        buttons.muteBtn.innerHTML = 'Audio Muted'
        buttons.muteBtn.classList.remove('btn-success')
        buttons.muteBtn.classList.add('btn-danger')
        socket.emit('audioChange', 'mute')
    }
}

buttons.joinRoom.addEventListener('click', joinRoom)
buttons.enableFeed.addEventListener('click', enableFeed)
buttons.sendFeed.addEventListener('click', sendFeed)
buttons.muteBtn.addEventListener('click', muteAudio)