const WebSocket = require('ws');
const {ContractListener} = require('fabric-network');

const participants = [];

exports.registerListener = async function (network) {
    try {

        let networkObj = await network.connectToNetwork('admin');

        //console.log(networkObj);

        if (networkObj.error) {
            console.error(networkObj.error);
            process.exit(1);
        }

        const listener = async (event) => {

            eventPayload = event.payload.toString();
            eventPayload = JSON.parse(eventPayload)

            // selective message to participants
            eventPayload.targetAudience.forEach(targetAudience => {
                const participant = participants[targetAudience];
                if(participant) {
                    participant.events.forEach( eventName => {
                        if(eventName === event.eventName) {
                            participant.connections.forEach( connection =>{
                                connection.send(JSON.stringify(eventPayload));
                            });
                        }
                    });
                }
            });

        };

        // We loop through each contract in the contracts array and we add the listener

        for (let contract of networkObj.contracts) {
            contract.addContractListener(listener);
        }


    } catch(error) {
        console.error(error);
        process.exit(1);
    }
}

exports.createWebSocketServer = async function () {
    const wss = new WebSocket.Server({ port: 8081 });

    wss.on('connection', function connection(ws) {

        var currentParticipant;

        ws.on('message', function incoming(participant) {

            console.log('message',participant);
            currentParticipant = JSON.parse(participant);

            if(participants[currentParticipant.id]) {
                console.log(`${currentParticipant.id} already in`)
                participants[currentParticipant.id].connections.push(ws);
            } else {
                console.log(`${currentParticipant.id} added`)
                currentParticipant.connections = [ws];
                participants[currentParticipant.id] = currentParticipant;
            }
            console.log(participants);
        });

        ws.on('close', function close() {
            console.log(participants);
            currentParticipant = participants[currentParticipant.id];
            if(currentParticipant) {
                for(let i=0;i<currentParticipant.connections.length;i++) {
                    console.log(`connection ${i}`)
                    if(currentParticipant.connections[i] == ws) {
                        console.log(`connection ${i} removed`)
                        currentParticipant.connections.splice(i,1);
                        break;
                    }
                }
                if(currentParticipant.connections.length == 0) {
                    console.log(`no more connections for ${currentParticipant.id}`)
                    delete participants[currentParticipant.id];
                }
            }
            console.log(participants);
        })

        ws.send('{"message":"added"}');
    });
}
