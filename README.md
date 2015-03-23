## Secure Chat

This repository for a secure chat service with a command line interface (CLI) written completely in node.js (https://nodejs.org/).

## Requirements

- Node.js (https://nodejs.org/)

## Chat client (secure-chat.js)
 
Consists of two parts:
- A sending client
- A receiving server

 The external config.json has the following flags with default values:

- serverRunning: false
- connected: false
- clientConnection: false
- secureConnection: false

 The server decides who should ask the authentication server for keys based on these flags. If a client crashes and won't start, its because the flags haven't been reset. Reset them manually in config.json (or debug_a.json/debug_b.json if running locally).

 *NOTE: Auto completion of common commands and help is not finished. Look below for commands you can use.*
 

### HOW TO CONNECT:

- Start server with `node secure-chat.js`
- Select local or external usage:
    - If local, select which client A or B you want to be.
- Make sure authentication server is running
- Make sure other client is running
- Type `connect` in order to connect to the other host specified in config.json
- For information about your connection, simply type `status` when the program is running.

_Also: Next time I write a description like this, I'll make it a poem._


## Authentication Server (auth-server.js)

This authenticats the priciplas. As of now there are no key distribution, so they would have to be exchanged physically.

## Using 

- Remember to update the list of accepted hosts! As of now, this is done directly in the code. See class for more info.
- Start server with `node auth-server.js`

