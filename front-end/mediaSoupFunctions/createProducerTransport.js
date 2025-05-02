
const createProducerTransport =(socket,device) => new Promise(async(resolve,reject)=>{
    //Ask the server to make a transport and send params
    const producerTransportParams = await socket.emitWithAck('requestTransport',{type:'producer'})
    const producerTransport = device.createSendTransport(producerTransportParams)
    
    producerTransport.on('connect',async({dtlsParameters},callback,errback)=>{
        //emit connectTransport 
        //dtlsparameter are created by the browser so we can finish
        console.log("Connect running on produce...")
        const connectResp = await socket.emitWithAck('connectTransport',{dtlsParameters,type:'producer'})
        console.log(connectResp,"ConnectResp is back")
        if(connectResp === 'success'){
            //we are connected! move forward
            callback()
        }else if(connectResp === 'error'){
            //connection failed. Stop
            errback()
        }
    })
    producerTransport.on('produce',async(parameters,callback,errback)=>{
        //emit startProducing
        console.log("Produce event is now running")
        const { kind,rtpParameters} = parameters;
        const produceResp = await socket.emitWithAck('startProducing',{kind,rtpParameters}) 
        console.log(produceResp,"produceResp is back!")
        if(produceResp === 'error'){
            errback()
        }else{
            callback({id:produceResp})
        }
    })
    // setInterval(async()=>{
    //     const stats = await producerTransport.getStats()
    //     for(const report of stats.value()){
    //         console.log(report.type)
    //     }
    // },1000)
    //send the trasnport back to main
    resolve(producerTransport)
})

export default createProducerTransport