'use strict';

const {Contract} = require('fabric-contract-api');
const EnergyTrading = require("./models/EnergyTrading");
const Participant = require("./models/Participant");
const Role = require('./roles/role');

class EnergyTradingContract extends Contract {

    async initLedger(ctx) {
        console.log('Init ledger called');
    }

    getParticipantRole(identity) {
        return identity.getAttributeValue('role');
    }

    async assetExists(ctx, assetId) {
        const buffer = await ctx.stub.getState(assetId);
        return (!!buffer && buffer.length > 0);
    }

    // Check if participant exists and has the role of 'PRODUCER'
    async createAsset(ctx, participantId, id, producer, energyType, units) {
        console.info('START : Create Asset');

        // Check if participant exists
        const participantAsBytes = await ctx.stub.getState('Participant:'+participantId);
        if (!participantAsBytes || participantAsBytes.length == 0) {
            throw new Error(`Participant with id ${participantId} does not exist`);
        }

        const participant = Participant.deserialise(participantAsBytes);

        // Only allow participants with role 'PRODUCER' to create an asset
        if (participant.role !== Role.PRODUCER && participant.role !== Role.PRODUCER_CUSTOMER) {
            throw new Error(`Participant with id ${participantId} does not have the required role to create an asset`);
        }

        const asset = new EnergyTrading(participantId, id, producer, energyType, units);
        asset.transactionHistory = [];

        await ctx.stub.putState(id, asset.serialise());
        console.info('END : Create Asset');
    }

    // Only allow 'DISTRIBUTOR' role to trade energy
    async tradeEnergy(ctx, buyerId, sellerId, sellingAssetNumber, units) {
        console.info('START : Trading Energy');

        const buyingAssetNumber = `asset_${new Date().getTime()}`; // new asset number based on timestamp

        const sellingAssetAsBytes = await ctx.stub.getState(sellingAssetNumber);

        if (!sellingAssetAsBytes || sellingAssetAsBytes.length === 0) {
            throw new Error(`${sellingAssetNumber} does not exist`);
        }

        const sellingAsset = EnergyTrading.deserialize(sellingAssetAsBytes);

        if (sellingAsset.getUnits() < units) {
            throw new Error('Not enough energy units for trading');
        }

        // Check permission
        console.log('Seller ID:', sellerId);
        console.log('Selling Asset Participant ID:', sellingAsset.getParticipantId());

        // Check permission
        if (sellingAsset.getParticipantId() !== sellerId) {
            throw new Error('Only the owner of the asset can sell it');
        }

        //Buyer and seller cannot be the same
        if (buyerId === sellerId) {
            throw new Error("Buyer and seller cannot be the same participant.");
        }

        // Create new buying asset
        const buyingAsset = new EnergyTrading(buyerId, buyingAssetNumber, sellingAsset.producer, sellingAsset.energyType, units);
        buyingAsset.transactionHistory = [];

        // Update units and transaction history
        sellingAsset.setUnits(sellingAsset.getUnits() - units);

        const transaction = {buyerId, sellerId, units, timestamp: new Date().toISOString(), targetAudience: [buyerId, sellerId]};
        buyingAsset.transactionHistory.push(transaction);
        sellingAsset.transactionHistory.push(transaction);

        await ctx.stub.putState(buyingAssetNumber, buyingAsset.serialise());
        await ctx.stub.putState(sellingAssetNumber, sellingAsset.serialise());

        // create a TradeCompleted event
        const eventPayload = Buffer.from(JSON.stringify(transaction));
        ctx.stub.setEvent('TradeCompleted', eventPayload);

        console.info('END : Trading Energy');
    }


    // Get transaction history for a specific asset
    async getTransactionHistory(ctx, assetId) {
        const assetAsBytes = await ctx.stub.getState(assetId);

        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`${assetId} does not exist`);
        }

        const asset = EnergyTrading.deserialize(assetAsBytes);

        return asset.getTransactionHistory();
    }

    // Read an asset
    async readAsset(ctx, assetId) {
        console.info('START : Read Asset');

        const assetAsBytes = await ctx.stub.getState(assetId);

        if (!assetAsBytes || assetAsBytes.length === 0) {
            throw new Error(`${assetId} does not exist`);
        }

        const asset = EnergyTrading.deserialize(assetAsBytes);

        console.info('END : Read Asset');

        return asset;
    }

    // Update an asset
    async updateAsset(ctx, assetId, newValues) {
        console.info('START : Update Asset');
        const jsonObject = this.convertNewValues(newValues);
        const exists = await this.assetExists(ctx, assetId);
        if (!exists) {
            throw new Error(`The asset ${assetId} does not exist`);
        }

        const assetAsBytes = await ctx.stub.getState(assetId);
        const asset = EnergyTrading.deserialize(assetAsBytes);

        for (const key in jsonObject) {
            asset[key] = jsonObject[key];
        }

        await ctx.stub.putState(assetId, asset.serialise());

        console.info('END : Update Asset');
    }

    // Delete an asset
    async deleteAsset(ctx, assetId) {
        console.info('START : Delete Asset');

        const exists = await this.assetExists(ctx, assetId);
        if (!exists) {
            throw new Error(`The asset ${assetId} does not exist`);
        }

        await ctx.stub.deleteState(assetId);

        console.info('END : Delete Asset');
    }

    convertNewValues(valueString) {
        valueString = valueString.replace(/\\/g, ''); // Remove backslashes
        valueString = valueString.replace(/[{}]/g, ''); // Remove backslashes
        valueString = valueString.slice(1, -1); // Remove opening and closing curly braces

        let dic = {};
        let valuePairs = valueString.split(",");

        for (let i = 0; i < valuePairs.length; i++) {
            let pair = valuePairs[i].split(":");
            let key = pair[0].trim().replace(/"/g, ""); // Remove double quotes and trim spaces
            let value = pair[1].trim().replace(/"/g, ""); // Remove double quotes and trim spaces
            dic[key] = value;
        }

        return dic;
    }
     convertNewValues2(valueString) {
         valueString = valueString.slice(1, valueString.length - 1);

         let dic = {};
         let valuePairs = valueString.split(",");


         for (let i = 0; i < valuePairs.length; i++){
             let pair = valuePairs[i].split(":");
             let key = pair[0].replace(/"/g, "");
             let value = pair[1].replace(/"/g, "");
             dic[key] = value;
         }

         return dic;
    }
}

module.exports = EnergyTradingContract;
