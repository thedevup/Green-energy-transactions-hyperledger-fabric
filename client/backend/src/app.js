'use strict';

const express = require('express');
const cors = require('cors');
const { verifyToken } = require('./auth');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

let eventHandler = require('./event-handler.js');
let network = require('./fabric/network.js');

app.use((req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        const payload = verifyToken(token);

        if (payload) {
            req.user = payload;
            next();
        } else {
            res.sendStatus(401);
        }
    } else {
        res.sendStatus(401);
    }
});

function requireAdmin(req, res, next) {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.sendStatus(403);
    }
}

function requirePRODUCER(req, res, next) {
    if (req.user && req.user.role === 'PRODUCER') {
        next();
    } else {
        res.sendStatus(403);
    }
}
function requireCUSTOMER(req, res, next) {
    if (req.user && req.user.role === 'CUSTOMER') {
        next();
    } else {
        res.sendStatus(403);
    }
}
function requirePRODUCER_CUSTOMER(req, res, next) {
    if (req.user && req.user.role === 'PRODUCER_CUSTOMER') {
        next();
    } else {
        res.sendStatus(403);
    }
}
function requireDISTRIBUTOR(req, res, next) {
    if (req.user && req.user.role === 'DISTRIBUTOR') {
        next();
    } else {
        res.sendStatus(403);
    }
}
app.get('/participants/:participantId', requireDISTRIBUTOR, async (req, res) => {
    let adminUser = await network.getAdminUser();

    let networkObj = await network.connectToNetwork(req.params.participantId);

    if (networkObj.error) {
        res.status(400).json({ message: networkObj.error });
    }

    let invokeResponse = await network.getParticipant(networkObj, req.params.participantId);

    if (invokeResponse.error) {
        res.status(400).json({ message: invokeResponse.error });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(invokeResponse);
    }
});

/**
 * Register a participant
 *
 * {"id":"participant-id","name":"name-participant","role":"name-of-the-role(like datascientist)>"}
 */
app.post('/participants',async (req, res) => {
    // creating the identity for the user and add it to the wallet. If no role is provided, the role will be 'UNASSIGNED'
    let response = await network.registerUser(req.body.id, req.body.name, req.body.role);

    if (response.error) {
        res.status(400).json({ message: response.error });
    } else {
        let adminUser = await network.getAdminUser();

        let networkObj = await network.connectToNetwork(adminUser);

        if (networkObj.error) {
            res.status(400).json({ message: networkObj.error });
        }

        let invokeResponse = await network.createParticipant(networkObj, req.body.id, req.body.name, req.body.role);

        if (invokeResponse.error) {
            res.status(400).json({ message: invokeResponse.error });
        } else {
            // Maak een payload voor de JWT
            const payload = {
                userId: req.body.id,
                role: req.body.role
            };

            // Onderteken de JWT met de geheime sleutel
            const secretKey = 'your-secret-key';  // Zorg ervoor dat dit overeenkomt met wat je in je verifyToken functie gebruikt
            const token = jwt.sign(payload, secretKey, { expiresIn: '999y' });  // Token zal 999 jaar geldig zijn

            // Stuur de JWT terug naar de client
            res.setHeader('Content-Type', 'application/json');
            res.status(201).json({ token: token, invokeResponse: invokeResponse });
        }
    }
});

app.put('/participants/:id/role', async (req, res) => {
    let response = await network.reEnrollUser(req.params.id, req.body.name, req.body.role);

    if (response.error) {
        res.status(400).json({ message: response.error });
    } else {
        let adminUser = await network.getAdminUser();

        let networkObj = await network.connectToNetwork(adminUser);

        if (networkObj.error) {
            res.status(400).json({ message: networkObj.error });
        }

        let invokeResponse = await network.updateParticipantRole(networkObj, req.params.id, req.body.role);

        if (invokeResponse.error) {
            res.status(400).json({ message: invokeResponse.error });
        } else {
            res.setHeader('Content-Type', 'application/json');
            res.status(200).send(invokeResponse);
        }
    }
});

// To do: Allow the DISTRIBUTOR and PRODUCER_CUSTOMER as well
app.post('/rest/assets', requirePRODUCER,async (req, res) => {
    let adminUser = await network.getAdminUser();
    let networkObj = await network.connectToNetwork(adminUser);

    if (networkObj.error) {
        res.status(400).json({ message: networkObj.error });
    }
    let invokeResponse = await network.createAsset(networkObj, req.body.participantId, req.body.id, req.body.producer, req.body.energyType, req.body.units);

    if (invokeResponse.error) {
        res.status(400).json({ message: invokeResponse.error });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(201).send(invokeResponse);
    }
});

// Only the Distributor can trade the energy between participants
app.post('/rest/trade', requireDISTRIBUTOR,async (req, res) => {
    let adminUser = await network.getAdminUser();
    let networkObj = await network.connectToNetwork(adminUser);

    if (networkObj.error) {
        res.status(400).json({ message: networkObj.error });
    }

    let invokeResponse = await network.tradeEnergy(networkObj, req.body.buyerId, req.body.sellerId, req.body.sellingAssetNumber, req.body.units);

    if (invokeResponse.error) {
        res.status(400).json({ message: invokeResponse.error });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(201).send(invokeResponse);
    }
});

app.get('/rest/asset/:assetId', async (req, res) => {
    let adminUser = await network.getAdminUser();
    let networkObj = await network.connectToNetwork(adminUser);

    if (networkObj.error) {
        res.status(400).json({ message: networkObj.error });
    }

    let invokeResponse = await network.readAsset(networkObj, req.params.assetId);

    if (invokeResponse.error) {
        res.status(400).json({ message: invokeResponse.error });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(invokeResponse);
    }
});

app.get('/rest/asset/:assetId/history', async (req, res) => {
    let adminUser = await network.getAdminUser();
    let networkObj = await network.connectToNetwork(adminUser);

    if (networkObj.error) {
        res.status(400).json({ message: networkObj.error });
    }

    let invokeResponse = await network.getTransactionHistory(networkObj, req.params.assetId);

    if (invokeResponse.error) {
        res.status(400).json({ message: invokeResponse.error });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(invokeResponse);
    }
});

app.put('/rest/asset/:assetId', requireDISTRIBUTOR, async (req, res) => {
    let adminUser = await network.getAdminUser();
    let networkObj = await network.connectToNetwork(adminUser);

    if (networkObj.error) {
        res.status(400).json({ message: networkObj.error });
    }

    let invokeResponse = await network.updateAsset(networkObj, req.params.assetId, JSON.stringify(req.body.newValue));

    if (invokeResponse.error) {
        res.status(400).json({ message: invokeResponse.error });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(invokeResponse);
    }
});

app.delete('/rest/asset/:assetId', requireDISTRIBUTOR, async (req, res) => {
    let adminUser = await network.getAdminUser();
    let networkObj = await network.connectToNetwork(adminUser);

    if (networkObj.error) {
        res.status(400).json({ message: networkObj.error });
    }

    let invokeResponse = await network.deleteAsset(networkObj, req.params.assetId);

    if (invokeResponse.error) {
        res.status(400).json({ message: invokeResponse.error });
    } else {
        res.setHeader('Content-Type', 'application/json');
        res.status(200).send(invokeResponse);
    }
});


const port = process.env.PORT || 8080;
app.listen(port);


eventHandler.createWebSocketServer();
eventHandler.registerListener(network);
