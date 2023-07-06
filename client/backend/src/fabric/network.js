'use strict';

const {Wallets} = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const {Gateway, X509WalletMixin} = require('fabric-network');
const path = require('path');
const fs = require('fs');
const {v4: uuidv4} = require('uuid');
const Role = require('./../../roles/role');
const { generateToken } = require('../auth');

// get the configuration
const configPath = path.join(process.cwd(), './config.json');
const configJSON = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(configJSON);
require('dotenv').config();

// let userName = config.userName;
let gatewayDiscovery = config.gatewayDiscovery;
let appAdmin = config.appAdmin;

// connect to the connection file
const ccpPath = path.resolve(process.env.FABRIC_PATH, config.connectionProfile);
const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));


exports.getAdminUser = async function () {
    return appAdmin;
}

exports.registerUser = async function (userId, name, role) {

    if (role !== Role.DISTRIBUTOR && role !== Role.CUSTOMER && role !== Role.PRODUCER && role !== Role.PRODUCER_CUSTOMER) {
        let response = {};
        response.error = 'This is not a valid role'
        return response;
    }

    if (!userId || !name || !role) {
        let response = {};
        response.error = 'All fields are mandatory';
        return response;
    }

    try {
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // Check to see if we've already enrolled the user.
        const userCheck = await wallet.get(userId);
        if (userCheck) {
            let response = {error: `Error! An identity for the user ${userId} already exists in the wallet. Please enter a different id`};
            return response;
        }

        // check if admin is enrolled
        const adminIdentity = await wallet.get(appAdmin);
        if (!adminIdentity) {
            let response = {error: `An identity for the admin user ${appAdmin} does not exist in the wallet`};
            return response;
        }

        // Create a new CA client to interact with the CA
        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const user = {
            affiliation: process.env.CONFIG_ORG, enrollmentID: userId, role: 'client',
            attrs: [{name: 'id', value: userId, ecert: true},
                {name: 'name', value: name, ecert: true},
                {name: 'role', value: role, ecert: true}]
        };

        const token = generateToken({
            userId: user.id,
            role: user.role
        });

        // Register and enroll the user, and import the new identity into the wallet.
        const secret = await ca.register(user, adminUser);

        const enrollmentData = {
            enrollmentID: userId,
            enrollmentSecret: secret,
            attr_reqs: [{name: "id", optional: false},
                {name: "name", optional: false},
                {name: "role", optional: false}]
        };

        const enrollment = await ca.enroll(enrollmentData);

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put(userId, x509Identity);

        let response = `Successfully registered user ${name}. Use userId ${userId} to login above.`;
        return response;
    } catch (error) {
        let response = {error: 'the following errors ocurred: ' + error.message ? error.message : error};
        return response;
    }
};

exports.reEnrollUser = async function (userId, name, role) {
    if (role !== Role.DISTRIBUTOR && role !== Role.CUSTOMER && role !== Role.PRODUCER && role !== Role.PRODUCER_CUSTOMER) {
        let response = {};
        response.error = 'Not a valid role'
        return response;
    }

    if (!userId || !role) {
        let response = {};
        response.error = 'All fields are mandatory';
        return response;
    }

    try {
        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        // This is an update method, so here it is checked if there is actually something to update
        const userIdentity = await wallet.get(userId);
        if (!userIdentity) {
            let response = {error: `This user does not exist. In order to re enroll, there should be an existing user`};
            return response;
        }

        // Check to see if we've already enrolled the admin user.
        const adminIdentity = await wallet.get(appAdmin);
        if (!adminIdentity) {
            let response = {error: `An identity for the admin user ${appAdmin} does not exist in the wallet`};
            return response;
        }

        const caURL = ccp.certificateAuthorities['ca.org1.example.com'].url;
        const ca = new FabricCAServices(caURL);

        // create an instance of the Identity Service which is necessary for updating a user in the CA
        const identityService = ca.newIdentityService();

        // build a user object for authenticating with the CA
        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const updateIdentityRequest = {
            enrollmentID: userId,
            affiliation: process.env.CONFIG_ORG,
            attrs: [{name: 'id', value: userId, ecert: true},
                {name: 'name', value: name, ecert: true},
                {name: 'role', value: role, ecert: true}]
        };

        // First update the users identity in the ca with the new attributes.
        await identityService.update(userId, updateIdentityRequest, adminUser);

        // Getting the user object from the wallet, which is necessary for re-enrollment.
        const userProvider = wallet.getProviderRegistry().getProvider(userIdentity.type);
        const user = await userProvider.getUserContext(userIdentity, userId);

        const enrollment = await ca.reenroll(user, [
            {name: 'id', optional: false},
            {name: 'name', optional: false},
            {name: 'role', optional: false},
        ]);

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };

        // Add the new wallet
        await wallet.put(userId, x509Identity);
        return `Successfully re enrolled user ${name}`;
    } catch (error) {
        return {error: 'the following errors ocurred: ' + error.message ? error.message : error};
    }
}

exports.connectToNetwork = async function (userName) {

    const gateway = new Gateway();

    try {
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const userCheck = await wallet.get(userName);
        if (!userCheck) {
            console.log('An identity for the user ' + userName + ' does not exist in the wallet');
            let response = {error: 'An identity for the user ' + userName + ' does not exist in the wallet. Register ' + userName + ' first'};
            return response;
        }

        await gateway.connect(ccp, {wallet, identity: userName, discovery: gatewayDiscovery});

        // Connect to our local fabric
        const network = await gateway.getNetwork('mychannel');

        // Get the contract we have installed on the peer
        const energyTradingContract = await network.getContract('energy-trading-chaincode', 'EnergyTradingContract');
        const identityContract = await network.getContract('energy-trading-chaincode', 'IdentityContract');

        let networkObj = {
            contracts: [
                energyTradingContract,
                identityContract
            ],
            network: network,
            gateway: gateway
        };

        return networkObj;

    } catch (error) {
        let response = {error: 'the following errors ocurred: ' + error.message ? error.message : error};
        return response;
    } finally {
        console.log('Done connecting to network.');
    }
};

exports.createParticipant = async function (networkObj, id, name, role) {
    try {

        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'IdentityContract')
            .submitTransaction('createParticipant', id, name, role);
        await networkObj.gateway.disconnect();
        return response.toString();
    } catch (error) {
        console.log('error', error);
        let response = {error: 'the following errors ocurred: '};
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};

exports.getParticipant = async function (networkObj, id) {
    try {
        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'IdentityContract')
            .evaluateTransaction('getParticipant', id);
        await networkObj.gateway.disconnect();
        return response.toString();
    } catch (error) {
        console.log(error);
        let response = {error: 'the following errors ocurred: '};
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};

exports.updateParticipantRole = async function (networkObj, id, role) {


    try {
        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'IdentityContract')
            .submitTransaction('updateParticipantRole', id, role);
        await networkObj.gateway.disconnect();
        return response.toString();
    } catch (error) {
        console.log(error);
        let response = {error: 'the following errors ocurred: '};
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};

exports.createAsset = async function (networkObj, participantId, id, producer, energyType, units) {
    try {
        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'EnergyTradingContract')
            .submitTransaction('createAsset', participantId, id, producer, energyType, units);
        await networkObj.gateway.disconnect();
        return response.toString();
    } catch (error) {
        console.log(error);
        let response = { error: 'the following errors ocurred: ' };
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};

exports.tradeEnergy = async function (networkObj, buyerId, sellerId, sellingAssetNumber, units) {
    try {
        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'EnergyTradingContract')
            .submitTransaction('tradeEnergy', buyerId, sellerId, sellingAssetNumber, units);
        await networkObj.gateway.disconnect();
        return response.toString();
    } catch (error) {
        console.log(error);
        let response = { error: 'the following errors ocurred: ' };
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};

exports.getTransactionHistory = async function (networkObj, assetId) {
    try {
        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'EnergyTradingContract')
            .evaluateTransaction('getTransactionHistory', assetId);
        await networkObj.gateway.disconnect();
        return JSON.parse(response.toString());
    } catch (error) {
        console.log(error);
        let response = { error: 'the following errors occurred: ' };
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};

exports.readAsset = async function (networkObj, assetId) {
    try {
        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'EnergyTradingContract')
            .evaluateTransaction('readAsset', assetId);
        await networkObj.gateway.disconnect();
        return JSON.parse(response.toString());
    } catch (error) {
        console.log(error);
        let response = { error: 'the following errors occurred: ' };
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};

exports.updateAsset = async function (networkObj, assetId, newValues) {
    try {
        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'EnergyTradingContract')
            .submitTransaction('updateAsset', assetId, JSON.stringify(newValues));
        await networkObj.gateway.disconnect();
        return response.toString();
    } catch (error) {
        console.log(error);
        let response = { error: 'the following errors ocurred: ' };
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};

exports.deleteAsset = async function (networkObj, assetId) {
    try {
        let response = await networkObj.contracts
            .find((contract) => contract.namespace === 'EnergyTradingContract')
            .submitTransaction('deleteAsset', assetId);
        await networkObj.gateway.disconnect();
        return response.toString();
    } catch (error) {
        console.log(error);
        let response = { error: 'the following errors ocurred: ' };
        for (var key in error) {
            response.error += key + ' - ' + error[key];
        }
        return response;
    }
};
