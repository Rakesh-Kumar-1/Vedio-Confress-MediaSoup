const updateActiveSpeakers = (room, io) => {
    const activeSpeakers = room.activeSpeakerList.slice(0, 5);
    const mutedSpeakers = room.activeSpeakerList.slice(5);
    const newTransportsByPeer = {};

    room.clients.forEach(client => {
        // Mute logic
        mutedSpeakers.forEach(pid => {
            if (client?.producer?.audio?.id === pid) {
                // Mute the producer if exists
                client?.producer?.audio?.pause && client.producer.audio.pause();
                client?.producer?.video?.pause && client.producer.video.pause();
                return;
            }
            const downstreamToStop = client.downstreamTransports.find(t => t?.audio?.producerId === pid);
            if (downstreamToStop) {
                downstreamToStop.audio?.pause && downstreamToStop.audio.pause();
                downstreamToStop.video?.pause && downstreamToStop.video.pause();
            }
        });

        // Unmute logic and new consumers
        const newSpeakersToThisClient = [];
        activeSpeakers.forEach(pid => {
            if (client?.producer?.audio?.id === pid) {
                client?.producer?.audio?.resume && client.producer.audio.resume();
                client?.producer?.video?.resume && client.producer.video.resume();
                return;
            }
            const downstreamToStart = client.downstreamTransports.find(t => t?.associatedAudioPid === pid);
            if (downstreamToStart) {
                downstreamToStart.audio?.resume && downstreamToStart.audio.resume();
                downstreamToStart.video?.resume && downstreamToStart.video.resume();
            } else {
                newSpeakersToThisClient.push(pid);
            }
        });
        if (newSpeakersToThisClient.length) {
            newTransportsByPeer[client.socket.id] = newSpeakersToThisClient;
        }
    });

    io.to(room.roomName).emit('updateActiveSpeakers', activeSpeakers);
    return newTransportsByPeer;
};

module.exports = updateActiveSpeakers;