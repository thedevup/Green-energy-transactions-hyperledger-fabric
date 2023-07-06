/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');


async function main() {
    try {
        // get configuration
        const configPath = path.join(process.cwd(), './config.json');
        const configJSON = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configJSON);

        // load the network configuration
        const ccpPath = path.resolve(process.env.FABRIC_PATH, config.connectionProfile);
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new CA client for interacting with the CA.
        const caInfo = ccp.certificateAuthorities[config.caName];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);


        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the admin user.
        const identity = await wallet.get('admin');
        if (identity) {
            console.log('An identity for the admin user "admin" already exists in the wallet');
            return;
        }

        // Enroll the admin user, and import the new identity into the wallet.
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });
        const payload = {
            userId: 'admin',
            role: 'admin'
        };
        const secretKey = 'your-secret-key';
        const token = jwt.sign(payload, secretKey, { expiresIn: '999y' });  // Token will be valid for 999 years

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org1MSP',
            type: 'X.509',
            jwtToken: token,
        };
        await wallet.put('admin', x509Identity);
        console.log('Successfully enrolled admin user "admin", generated JWT token, and imported both into the wallet');
        fs.writeFile('admin.jwt', token, (err) => {
            if (err) {
                console.error('Er was een fout bij het schrijven van de JWT naar een bestand:', err);
            } else {
                console.log('JWT succesvol geschreven naar bestand.');
            }
        });

    } catch (error) {
        console.error(`Failed to enroll admin user "admin": ${error}`);
        process.exit(1);
    }
}

main();
