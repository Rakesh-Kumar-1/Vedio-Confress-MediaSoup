import createConsumer from "./createConsumer"
import createConsumerTransport from "./createConsumerTransport"

const requestTransportToConsume = (consumeData,socket,device,consumers) => {
    consumeData.audioPidsToCreate.foreach(async(audioPid,i)=>{
        const videoPid = consumeData.videoPidsToCreate[i]
        const consumerTransportParams = await socket.emitWithAck('requestTransport',{type:'consumer',audioPid})
        console.log(consumerTransportParams)
        const consumerTransport = createConsumerTransport(consumerTransportParams,device,socket,audioPid)
        const[audioConsumer,videoConsumer] = await Promise.all([
            createConsumer(consumerTransport,audioPid,device,socket,'audio',i),
            createConsumer(consumerTransport,videoPid,device,socket,'video',i)
        ])
        console.log(audioConsumer)
        console.log(videoConsumer)

        const combinedStream = new MediaStream([audioConsumer?.track,videoConsumer?.track])
        const remoteVideo = document.getElementById(`remote-video-${i}`)
        remoteVideo.srcObject = combinedStream
        console.log('Hope this works.')
        consumers[audioPid]={
            combinedStream,
            userName: consumeData.associatedUserName[i],
            consumerTransport,
            audioConsumer,
            videoConsumer,
            
        }
    })
}

export default requestTransportToConsume