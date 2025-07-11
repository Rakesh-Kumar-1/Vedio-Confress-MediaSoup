const config = require('../config/config')
const newDominantSpeaker = require('../utilities/newDominantSpeaker')

class Room {
    constructor(roomName, workerToUse) {
        this.roomName = roomName
        this.worker = workerToUse
        this.router = null
        //all the client object that are in this room
        this.clients = []
        //An array of ids with trhe most recent dominant speaker first
        this.activeSpeakerList = []
    }
    addClient(client) {
        this.clients.push(client);
        client.room = this;
    }
    async createRouter(io) {
        if (this.router) return; // Prevent re-creation

        try {
            this.router = await this.worker.createRouter({
                mediaCodecs: config.routerMediaCodecs
            });
            this.activeSpeakerObserver = await this.router.createActiveSpeakerObserver({
                interval: 300 // ms, default is 300
            });
            this.activeSpeakerObserver.on('dominantspeaker', ds => newDominantSpeaker(ds, this, io));
        } catch (err) {
            console.error('Error creating router or active speaker observer:', err);
            throw err;
        }
    }
}

module.exports = Room
