const fs = require('fs') 
const https = require('https') 
const http = require('http')
const express = require('express')
const app = express()
app.use(express.static('public'))
const httpServer = http.createServer(app)

const socketio = require('socket.io')
const mediasoup = require('mediasoup')

const config = require('./config/config')
const createWorkers = require('./utilities/createWorkers')
const getWorker = require('./utilities/getWorker')
const updateActiveSpeakers = require('./utilities/updateActiveSpeakers')
const Client = require('./classes/Client')
const Room = require('./classes/Room')
const { type } = require('os')
const io = socketio(httpServer, {
    // cors: [`https://localhost:${config.port}`],
    cors: ['http://localhost:5173']
    // cors: [`https://192.168.1.44`]
})


let workers = null
const rooms = [];
//initMediaSoup gets mediasoup ready to do its thing
const initMediaSoup = async () => {
    workers = await createWorkers()
}

initMediaSoup()

// socketIo listeners
io.on('connect', socket => {
    let client;  
    const handshake = socket.handshake  
    socket.on('joinRoom', async ({ userName, roomName }, ackCb) => {
        let newRoom = false;
        client = new Client(userName, socket)
        let requestedRoom = rooms.find(room => room.roomName === roomName)
        if (!requestedRoom) {
            newRoom = true;
            // Make the new room,add a worker
            const workerToUse = await getWorker(workers)
            requestedRoom = new Room(roomName, workerToUse)
            await requestedRoom.createRouter(io);
            //console.log("Router after creation:", requestedRoom.router);
            rooms.push(requestedRoom)
        }
        //Add the room to the client
        client.room = requestedRoom
        //Add the client to the room Client
        client.room.addClient(client)
        //Add this socket to the socket room
        socket.join(client.room.roomName)

        const audioPidsToCreate = client.room.activeSpeakerList.slice(0, 5)
        //find the vedioPids and make an array with matching indices
        // for our audioPids
        const videoPidsToCreate = audioPidsToCreate.map(aid => {
            const producingClient = client.room.clients.find(c => c?.producer?.audio?.id === aid)
            return producingClient?.producer?.video?.id
        })
        //find the username and make an array with matching indices
        // for our audioPids/videopids
        const associatedUserNames = audioPidsToCreate.map(aid => {
            const producingClient = client.room.clients.find(c => c?.producer?.audio?.id === aid)
            return producingClient?.userName
        })
        ackCb({
            routerRtpCapabilities: client.room.router.rtpCapabilities,
            newRoom,
            audioPidsToCreate,
            videoPidsToCreate,
            associatedUserNames
        });
    })
    socket.on('requestTransport', async ({ type, audioPid }, ackCb) => {
        //Whether producer or consumer ,client needs params
        let clientTransportParams;
        if (type === 'producer') {
            // run addclient,which is aprt of our client class
            clientTransportParams = await client.addTransport(type)
        } else if (type === 'consumer') {
            const producingClient = client.room.clients.find(c => c.producer.audio.id === audioPid)
            const videoPid = producingClient?.producer?.video?.id
            clientTransportParams = await client.addTransport(type, audioPid, videoPid)
        }
        ackCb(clientTransportParams)
    })
    socket.on('connectTransport', async ({ dtlsParameters, type }, ackCb) => {
        if (type === 'producer') {
            try {
                await client.upstreamTransport.connect({ dtlsParameters })
                ackCb('success')
            } catch (error) {
                console.log(error)
                ackCb('error')
            }
        } else if (type === 'consumer') {
            //find the right transport, for this consumer
            try {
                const downstreamTransport = client.downstreamTransports.find(t => {
                    return t.associatedAudioPid === audioPid
                })
                downstreamTransport.transport.connect({ dtlsParameters })
                ackCb('success')
            }
            catch (error) {
                console.log(error)
                ackCb('error')
            }
        }
    })
    socket.on('startProducing', async ({ kind, rtpParameters }, ackCb) => {
        // create a producer with the rtpParameters we were sent
        try {
            const newProducer = await client.upstreamTransport.produce({ kind, rtpParameters })
            //the front end is waiting for the id
            client.addProducer(kind, newProducer)
            if(kind === 'audio'){
                client.room.activeSpeakerList.push(newProducer.id)
            }
            //the frontend is waiting for the id
            ackCb(newProducer.id)
        } catch (err) {
            console.log(err)
            ackCb(err)
        }
        //run updateActiveSpeakers
        const newTransportsByPeer = updateActiveSpeakers(client.room,io)
        for(const [socketId, audioPidsToCreate] of Object.entries(newTransportsByPeer)){
            const videoPidsToCreate = audioPidsToCreate.map(aPid=>{
                const producerClient = client.room.clients.find(c=>c?.producer?.audio?.id === aPid)
                return producerClient?.producer?.video?.id
            })
            const associatedUserNames = audioPidsToCreate.map(aPid=>{
                const producerClient = client.room.clients.find(c=>c?.producer?.audio?.id === aPid)
                return producerClient?.userName
            })
            io.to(socketId).emit('newProducersToConsume',{
                routerRtpCapabilities: client.room.router.rtpCapabilities,
                audioPidsToCreate,
                videoPidsToCreate,
                associatedUserNames,
                activeSpeakerList: client.room.activeSpeakerList.slice(0,5)
            })
        }
    })
    socket.on('audioChaneg', typeOfChange => {
        if (typeOfChange === 'mute') {
            client?.producer?.audio?.pause()
        } else {
            client?.producer?.audio?.resume()
        }
    })
    socket.on('consumeMedia', async ({ rtpCapabilities, pid, kind }, ackCb) => {
        console.log("Kind: ", kind, " Pid:", pid)
        try {
            if (!client.room.router.canConsume({ producerId: pid, rtpCapabilities })) {
                ackCb("cannotConsume")
            } else {
                const downstreamTransport = client.downstreamTransport.find(t => {
                    if (kind === 'audio') {
                        return t.associatedAudioPid === pid
                    } else if (kind === 'video') {
                        return t.associatedVideoPid === pid
                    }
                })
                //create the consumer with  the transport
                const newConsumer = await downstreamTransport.transport.consume({
                    producerId: pid,
                    rtpCapabilities,
                    paused: true
                })
                // add this newConsumer to the client
                client.addConsumer(kind, newConsumer, downstreamTransport)
                // respond with params
                const clientParams = {
                    producerId: pid,
                    id: newConsumer.id,
                    kind: newConsumer.kind,
                    rtpParameters: newConsumer.rtpParameters
                }
                ackCb(clientParams)
            }
        } catch (err) {
            console.log(err)
            ackCb('consumeFailed')
        }
    })
    socket.on('unpauseConsumer',async({pid,kind},ackCb)=>{
        const consumerToResume = client.downstreamTransports.find(t=>{
            return t?.[kind].producerId === pid
        })
        await consumerToResume[kind].resume()
        ackCb()
    })

})

httpServer.listen(config.port, () => {
    console.log("Server is runing on port 3031")
})
