
const createConsumer = (consumerTransport,pid,device,socket,kind,slot) => {
    return new Promise(async(resolve,reject)=>{
        const consumerParams = await socket.emitWithAck('consumeMedia',{rtpCapabilities:device.rtpCapabilities,pid,kind})
        console.log(consumerParams)
        if(consumerParams === 'cannotConsume'){
            console.log("Cannot consume")
            resolve()
        }else if(consumerParams === 'consumeFailed'){
            console.log("Coonsume failed...")
            resolve()
        }else{
            // We got valid params! Use them to consume
            const consumer = await consumerTransport.consume(consumerParams)
            const {track} = consumer
            //add track events //unpause
            await socket.emit('unpauseConsumer',pid,kind)
            resolve(consumer)
        }
    })
}

export default createConsumer