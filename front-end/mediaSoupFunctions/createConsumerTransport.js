
const createConsumerTransport = (transportParams,device,socket,audioPid) => {
    const consumerTransport = device.createRecvTransport(transportParams)
    consumerTransport.on('connectionstatechange',state=>{
        console.log("==connectionstatechange")
        console.log(state)
    })
    consumerTransport.on('icegatheringstatechange',state=>{
        console.log("==icegatheringstatechange")
        console.log(state)
    })
    consumerTransport.on('connect',async({dtlsParameters},callback,errback)=>{
        console.log("Transport connect event has fired")
        const connectResp = await socket.emitwithAck('connectTransport',{dtlsParameters,type:"consumer",audioPid})
        if(connectResp === 'success'){
            callback()
        }else{
            errback()
        } 
    })
    return consumerTransport
}

export default createConsumerTransport