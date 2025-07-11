const config = require("../config/config");

class Client {
    constructor(userName, socket) {
        this.userName = userName;
        this.socket = socket;
        this.upstreamTransport = null;
        this.producer = {};
        this.room = null;
        this.downstreamTransports = [];
    }

    async addTransport(type, audioPid = null, videoPid = null) {
        const { listenIps, initialAvailableOutgoingBitrate, maxIncomingBitrate } = config.webRtcTransport;
        
        const transport = await this.room.router.createWebRtcTransport({
            enableUdp: true,
            enableTcp: true,
            preferUdp: true,
            listenIps: listenIps,
            initialAvailableOutgoingBitrate,
        });

        if (maxIncomingBitrate) {
            try {
                await transport.setMaxIncomingBitrate(maxIncomingBitrate);
            } catch (err) {
                console.log('Error setting bitrate', err);
            }
        }

        const clientTransportParams = {
            id: transport.id,
            iceParameters: transport.iceParameters,
            iceCandidates: transport.iceCandidates,
            dtlsParameters: transport.dtlsParameters,
        };

        if (type === 'producer') {
            this.upstreamTransport = transport;
        } else if (type === 'consumer') {
            this.downstreamTransports.push({
                transport,
                associatedVideoPid: videoPid,
                associatedAudioPid: audioPid,
                audio: null,
                video: null,
            });
        }

        return clientTransportParams;
    }

    addProducer(kind, newProducer) {
        this.producer[kind] = newProducer;
        if (kind === 'audio' && this.room && this.room.activeSpeakerObserver) {
            this.room.activeSpeakerObserver.addProducer({
                producerId: newProducer.id
            });
        }
    }

    addConsumer(kind, newConsumer, downstreamTransport) {
        if (downstreamTransport) {
            downstreamTransport[kind] = newConsumer;
        }
    }

    findDownstreamByAudioPid(pid) {
        return this.downstreamTransports.find(
            t => t?.associatedAudioPid === pid
        ) || null;
    }

    findDownstreamByConsumerProducerId(pid) {
        return this.downstreamTransports.find(
            t => t?.audio?.producerId === pid
        ) || null;
    }

    removeDownstreamTransportByAudioPid(pid) {
        this.downstreamTransports = this.downstreamTransports.filter(
            t => !(t?.associatedAudioPid === pid)
        );
    }
}

module.exports = Client;
