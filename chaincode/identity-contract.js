'use strict';

const { Contract } = require('fabric-contract-api');
const Participant = require("./models/Participant");
const Role = require('./roles/role');

class IdentityContract extends Contract {

    isAdmin(identity) {
        var match = identity.getID().match('.*CN=(.*)::');
        return match !== null && match[1] === 'admin';
    }

    getParticipantId(identity) {
        return identity.getAttributeValue('id');
    }

    getParticipantRole(identity) {
        return identity.getAttributeValue('role');
    }

    isRoleValid(role) {
        if (role !== Role.CUSTOMER && role !== Role.DISTRIBUTOR && role !== Role.PRODUCER && role !== Role.PRODUCER_CUSTOMER) {
            return false;
        }
        return true;
    }

    async assetExists(ctx, assetId) {

        const buffer = await ctx.stub.getState(assetId);
        return (!!buffer && buffer.length > 0);
    }

    async createParticipant(ctx, id, name, role) {

        let identity = ctx.clientIdentity;

        if (!this.isRoleValid(role)) {
            throw new Error(`The specified role is not valid, please enter a correct one. Valid roles are:
            ${Role.CUSTOMER}, ${Role.DISTRIBUTOR}, ${Role.PRODUCER}, ${Role.PRODUCER_CUSTOMER}`);
        }

        if (!this.isAdmin(identity)) {
            throw new Error(`Only administrators can create participants`);
        }

        // Generate a participant representation
        let participant = new Participant(id, name, role);

        // generate the key for the participant
        let key = participant.getType() + ":" + participant.getId();

        // check if the participant already exists
        let exists = await this.assetExists(ctx, key);

        if (exists) {
            throw new Error(`Participant with id ${key} already exists`);
        }

        // update state with new participant
        await ctx.stub.putState(key, participant.serialise())

        // Return the new participant
        return JSON.stringify(participant);
    }

    async getParticipant(ctx, id) {
        let identity = ctx.clientIdentity;

        console.log(this.getParticipantRole(identity))

        if (!id === this.getParticipantId(identity) && !this.isAdmin(identity)) {
            throw new Error(`Only administrators can query other participants. Regular participants can get information of their own account`);
        }

        // get participant
        const buffer = await ctx.stub.getState('Participant:'+id);

        // if participant was not found
        if (!buffer || buffer.length == 0) {
            throw new Error(`Participant with id ${id} was not found`);
        }

        // get object from buffer
        const participant = Participant.deserialise(buffer);
        // Return the participant
        return JSON.stringify(participant);
    }

    async getAllParticipants(ctx) {
        let identity = ctx.clientIdentity;

        if (!this.isAdmin(identity)) {
            throw new Error(`Only administrators can query all participants`);
        }

        const iterator = await ctx.stub.getStateByRange('', '');

        const allResults = [];

        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                const key = res.value.key;

                if (key.startsWith('Participant')) {
                    let value;
                    try {
                        value = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        console.log(err);
                        value = res.value.value.toString('utf8');
                    }

                    allResults.push({
                        id: value.id,
                        name: value.name,
                        role: value.role
                    });
                }
            }

            if (res.done) {
                await iterator.close();
                return JSON.stringify(allResults);
            }
        }
    }

    async updateParticipantRole(ctx, participantId, role) {
        let identity = ctx.clientIdentity;

        if (!this.isRoleValid(role)) {
            throw new Error(`The specified role is not valid, please enter a correct one. Valid roles are:
            ${Role.CUSTOMER}, ${Role.DISTRIBUTOR}, ${Role.PRODUCER}, ${Role.PRODUCER_CUSTOMER}`);
        }

        if (!this.isAdmin(identity)) {
            throw new Error('Only administrators can update the role of other participants.');
        }

        const buffer = await ctx.stub.getState(`Participant:${participantId}`);

        // if participant was not found
        if (!buffer || buffer.length == 0) {
            throw new Error(`Participant with id ${participantId} was not found`);
        }

        const participant = Participant.deserialise(buffer);

        participant.setRole(role);

        await ctx.stub.putState(`${participant.getType()}:${participantId}`, participant.serialise());

        return JSON.stringify(participant);
    }
}

module.exports = IdentityContract;
