const createProducer = async (localStream, producerTransport) => {
    return new Promise(async (resolve, reject) => {
        // Get the audio and video track
        const videoTrack = localStream.getVideoTracks()[0];
        const audioTrack = localStream.getAudioTracks()[0];

        try {
            // Running the produce method will trigger the transport "connect" event
            const videoProducer = await producerTransport.produce({ track: videoTrack });
            const audioProducer = await producerTransport.produce({ track: audioTrack });
            resolve({ audioProducer, videoProducer });
        } catch (err) {
            console.log(err, 'error producing');
            reject(err); // Reject the promise in case of failure
        }
    });
};

export default createProducer;
