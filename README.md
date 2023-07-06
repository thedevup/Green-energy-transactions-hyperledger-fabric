# Enabling Green Energy Transactions with Hyperledger Fabric

This project is a blockchain application for trading renewable energy, built with Hyperledger Fabric. It is based on the [Hyperledger Fabric Samples](https://github.com/hyperledger/fabric-samples) and has been modified to suit the specific needs of this project.

## Use Case Description

This project aims to develop a blockchain network that facilitates energy trading among various participants. The participants, who could be energy companies or consumers, can buy and sell energy units. These transactions are securely and immutably recorded on the blockchain, facilitating the trading of renewable energy.

### Motivations

The motivations behind picking this use case are as follows:

- **Positive impact on the environment**: Encouraging the adoption of renewable energy can help reduce greenhouse gas emissions, contributing to a greener future.

- **Decentralization**: This use case demonstrates how a permissioned blockchain network based on Hyperledger Fabric can enable peer-to-peer energy trading, empowering individual prosumers and promoting energy independence.

- **Ethical and social consideration**: Our case encourages discussions about the ethical and social impacts of using blockchain technology in the renewable energy sector.

- **Stakeholders collaborations**: There is a need for cooperation among different stakeholders in the renewable energy ecosystem, including prosumers, regulatory bodies, and energy sellers.

## Data and Transaction Model
Participants, assets, and transactions are modeled using Hyperledger Fabric chaincode.

- Participants are identified by unique identifiers.
- Assets, in this case, energy units, are represented by their quantity and the owner.
- Transactions depict the transfer of energy units from one participant to another.

The blockchain ledger tracks the state of each participant and transaction.

## Logic (Smart Contracts)
The project utilizes two smart contracts (`chaincode`), which define the business rules and enforce them during each transaction.

1. `energy-trading-contract.js`: This contract manages the creation, reading, updating, and deletion (CRUD) of energy assets and their trading between participants. The contract ensures that only participants with 'PRODUCER' or 'PRODUCER_CUSTOMER' roles can create an asset. The trading of energy is restricted to the 'DISTRIBUTOR' role.

2. `identity-contract.js`: This contract manages the CRUD of participants and ensures that only administrators can perform these operations. Regular participants can only access information about their own account.

The `getParticipantRole` and `assetExists` methods are used in both contracts to check a participant's role and the existence of an asset before performing operations.

The contracts use the `Participant` and `EnergyTrading` models from the `models` folder and the `Role` model from the `roles` folder.

## Project Structure

The project is divided into two main parts: the chaincode and the client.

### Chaincode

The chaincode directory contains the smart contracts for the blockchain network. It includes the following files:

- `index.js`: This file exports the smart contracts to be used in the blockchain network. It is the entry point for the chaincode execution.

- `energy-trading-contract.js`: This file defines the smart contract for energy trading. It includes the logic for creating and updating energy assets, and for trading energy between participants.

- `identity-contract.js`: This file defines the smart contract for managing identities in the blockchain network. It includes the logic for creating and updating participant identities.

The `models` subdirectory contains the models for the different entities in the blockchain network:

- `EnergyTrading.js`: This file defines the model for an energy trading asset. It includes the properties of the asset and methods for managing the asset's state.

- `Participant.js`: This file defines the model for a participant in the blockchain network. It includes the properties of the participant and methods for managing the participant's state.

- `State.js`: This file defines the base model for a state in the blockchain network. It includes methods for converting the state to and from a buffer.

The `roles` subdirectory contains the roles for the different entities in the blockchain network:

- `role.js`: This file defines the roles that a participant can have in the blockchain network. It is used to enforce access control in the smart contracts.

### Client

The client directory contains the backend for the client application. It includes the following files:

- `package.json`: This file lists the dependencies of the client application. It also includes scripts for running the application and other metadata.

The `backend` subdirectory contains the backend for the client application:

- `package.json`: This file lists the dependencies of the backend of the client application. It also includes scripts for running the application and other metadata.

- `config.json`: This file contains the configuration for the backend of the client application. It includes information such as the network configuration and the admin user.

The `backend/roles` subdirectory contains the roles for the different entities in the client application:

- `role.js`: This file defines the roles that a user can have in the client application. It is used to enforce access control in the application.

The `backend/src` subdirectory contains the source code for the backend:

- `app.js`: This file is the entry point for the backend of the client application. It sets up the express server and the routes for the application.

- `enroll-admin.js`: This file contains the script for enrolling an admin user with the certificate authority. It is used to set up the admin user for the first time.

- `event-handler.js`: This file contains the logic for handling events from the blockchain network. It includes a WebSocket server for sending events to the client application.

The `backend/src/fabric` subdirectory contains the network configuration for the Fabric network:

- `network.js`: This file contains the logic for interacting with the Hyperledger Fabric network. It includes methods for registering and enrolling users, connecting to the network, and invoking transactions on the smart contracts.

### Roles

Currently, the application has 4 different roles a participant can have `CUSTOMER`,`PRODUCER`,`DISTRIBUTOR`,`PRODUCER_CUSTOMER`

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

What things you need to install the software and how to install them:

- [Node.js and npm](https://nodejs.org/en/download/)
- [Docker](https://www.docker.com/products/docker-desktop)
- [Hyperledger Fabric](https://hyperledger-fabric.readthedocs.io/en/latest/install.html)

## Installation

This guide will walk you through the installation process of the Energy trading platfor.

### Prerequisites

Before installing the platform, make sure your system meets the following prerequisites from the official [website](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html) of hyperledger-fabric.

### Installation Steps Hyperledger fabric

#### Step 1 download Hyperledger fabric

Navigate to the directory where you want to work in and clone the hyperledger fabric repository in with the following command:

```bash
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
```

#### Step 2 install necessary dependencies

Install the necessary dependencies for this hyperledger project with the following command:
```bash
./install-fabric.sh d s b
```
If other dependencies are required, specify the components to download add one or more of the following arguments. Each argument can be shortened to its first letter.

`docker` to use Docker to download the Fabric Container Images   
`binary` to download the Fabric binaries  
`samples` to clone the fabric-samples github repo to the current directory

## Privacy and Security

The network uses JSON Web Tokens (JWT) for authentication. JWT is an open standard that defines a compact and self-contained way for securely transmitting information between parties. This information can be verified and trusted because it is digitally signed.

When an admin enrolls with the `enroll-admin.js` script, they receive a JWT. This token allows the admin to make certain API calls that are restricted to admins such as creating a new participant or updating the role of a participant. The token is included in the Authorization header of the API requests, and the server verifies the token before processing the request.

Only the admin can create a participant, and when this new participant is created, they also receive a JWT based on their role. This token allows the participant to make API calls that are appropriate for their role. For example, a participant with the role of 'PRODUCER' might be allowed to create energy assets, while a participant with the role of 'DUSTRIBUTOR' might be allowed to to trade energy between aprticipants. The server checks the role of the participant from the JWT before processing the request.

The JWTs are created and verified using the `auth.js` file. This file contains functions for generating and verifying JWTs. The tokens are created with a secret key and have no expiration date, meaning they remain valid indefinitely (It can be changed). The secret key should be kept secure, as anyone with the key can create valid tokens.


## Integration
External systems can interact with the blockchain network through API calls and events, as defined in the `app.js` file.

An event is emmited when energy is traded between two participants (usually done by a 'DISTRIBUTOR'), and both the buyer and the seller are notified.

In the section below API calls can be seen with more details, or they can be imported to Postman using this [link](https://api.postman.com/collections/27087574-de2721f9-b8c2-4b7b-ba0e-f71083ee2370?access_key=PMAT-01H46SAM638BFMFJBNQABPM5T2).

### Making API Calls

These instructions will guide you on how to make API calls to the project. 

You can use any API client like [Postman](https://www.postman.com/downloads/) or [curl](https://curl.se/) to make these calls.

Here are some example API calls:

1. To register a new participant:
   ```
   POST /participants
   Content-Type: application/json

   {
     "id": "participant1",
     "name": "Participant 1",
     "role": "DISTRIBUTOR"
   }
   ```

2. To get a participant:
   ```
   GET /participants/participant1
   ```

3. To update a participant's role:
   ```
   PUT /participants/participant1/role
   Content-Type: application/json

   {
     "name": "Participant 1",
     "role": "DISTRIBUTOR"
   }
   ```

4. To create an asset:
   ```
   POST /rest/assets
   Content-Type: application/json

   {
     "participantId": "participant1",
     "id": "asset1",
     "producer": "Producer1",
     "energyType": "Type1",
     "units": 100
   }
   ```

5. To trade energy:
   ```
   POST /rest/trade
   Content-Type: application/json

   {
     "buyerId": "participant2",
     "sellerId": "participant1",
     "sellingAssetNumber": "asset1",
     "units": 50
   }
   ```

6. To get an asset:
   ```
   GET /rest/asset/asset1
   ```

7. To get an asset's history:
   ```
   GET /rest/asset/asset1/history
   ```

8. To update an asset:
   ```
   PUT /rest/asset/asset1
   Content-Type: application/json

   {
     "newValue": 200
   }
   ```

9. To delete an asset:
    ```
    DELETE /rest/asset/asset1
    ```

## Architecture Organisation
The Hyperledger Fabric network in this project is composed of a single organization, operating one or more peers.

- The organization represents a managed group of members.
- Peers are fundamental elements of the network because they host ledgers and smart contracts.
- Channels are private subnets of communication between specific network members, enabling secure information transfer.
- Fabric-CA is the default Certificate Authority, responsible for issuing and managing certificates.

The network is set up and configured using a configuration file, in our case it is `conf.json`, and controlled using scripts like `network.sh`.

## Network Hosting
The network is hosted using Docker, each peer, orderer, and Certificate Authority (CA) runs in its own Docker container. CouchDB is used as the state database for each peer, providing a JSON-based document data model that allows for rich queries against the ledger data.

## Running the Project
Detailed instructions for getting the project up and running, including installing dependencies, building the network, deploying the contract, enrolling the admin, and starting the API server are provided down below. The project can be interacted with via API calls.

#### Step 1: Build the Network
First Nagivate to recently downloaded fabric-samples/test-network folder and run:
```bash
./network.sh down
./network.sh up createChannel -ca -s couchdb
```

#### Step 2: Deploying the contract on the network

```bash
/network.sh deployCC -ccn energy-trading-chaincode -ccp [Base-folder]/blockchain-architecture/chaincode -ccv 1 -ccs 1 -ccl javascript
```

#### Step 3: Install Dependencies

Export the fabric path:

```bash
export FABRIC_PATH=~/fabric-samples
```

Then move to the blockchain-architecture/client/backend folder and install the necessary Node.js dependencies:

```bash
npm --logevel=error install
```

#### Step 4: Enrolling the admin

Enroll the admin like so:
(note if there is already an Admin.id file present, this should be deleted before running the command again)

```bash
node src/enroll-admin.js
```

#### Step 5: Start the API Server

Start the API server:

```bash
npm start
```

To stop, you can run `./network.sh down` in the `fabric-samples/test-network`

## References

- Andoni, M., Robu, V., Flynn, D., Abram, S., Geach, D., Jenkins, D., . . . Peacock, A. (2019). Blockchain technology in the energy sector: A systematic review of challenges and opportunities. Renewable and Sustainable Energy Reviews, 100, 143-174. https://doi.org/10.1016/j.rser.2018.10.014
