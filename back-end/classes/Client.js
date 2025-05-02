const config = require("../config/config");

class client {
    constructor(userName, socket) {
        this.userName = userName;
        this.socket = socket;
        //Instead of calling producerTransport call it upStream
        this.upstreamTransport = null;
        //We will have an audio and vedio consumer
        this.producer = {}
        //Instead of calling consumerTransport call it downStream
        this.downstreamTransports = []
        // {
        //     transport,  //will handle both audio and vedio
        //     associatedVideoPid
        //     associatedAudioPid
        //     audio = audioConsumer
        //     video = videoconsumer
        // }

        //An array of consumer,each with 2 parts
        // this.consumers = []
        //A room object
        this.room = null;
    }
    addTransport(type, audioPid = null, videoPid = null) {
        return new Promise(async (resolve, reject) => {
            const { listenIps, initialAvailableOutgoingBitrate, maxIncomingBitrate } = config.webRtcTransport
            const transport = await this.room.router.createWebRtcTransport({
                enableUdp: true,
                enableTcp: true,
                preferUdp: true,
                listenInfos: listenIps,
                initialAvailableOutgoingBitrate,
            });
            if (maxIncomingBitrate) {
                try {
                    await transport.setMaxIncomingBitrate(maxIncomingBitrate)
                } catch (err) {
                    console.log('Error setting bitrate')
                }
            }

            const clientTransportParams = {
                id: transport.id,
                iceParameters: transport.iceParameters,
                iceCandidates: transport.iceCandidates,
                dtlsParameters: transport.dtlsParameters,
            }
            if (type === 'producer') {
                //set the new transport to the client's upstreamTransport
                this.upstreamTransport = transport
                // setInterval(async()=>{
                //     const stats = await this.upstreamTransport.getStats()
                //     for(const report of stats.values()){
                //         if(report.type === 'webrtc-transport'){
                //             console.log(report.bytesReceived,'-',report.rtpBytesReceived)
                //         }
                //     }
                // },1000)
            } else if (type === 'consumer') {
                this.downstreamTransports.push({
                    transport,  //will handle both audio and vedio
                    associatedVideoPid: videoPid,
                    associatedAudioPid: audioPid,
                })
            }
            resolve(clientTransportParams) //What we send back to the client
        })
    }
    addProducer(kind, newProducer) {
        this.producer[kind] = newProducer
        if (kind === 'audio') {
            //Add this to our activeSpeakerObserver
            this.room.activeSpeakerObserver.addProducer({
                producerId: newProducer.id
            })
        }
    }
    addConsumer(kind, newConsumer, downstreamTransport) {
        downstreamTransport[kind] = newConsumer
    }
}

module.exports = client