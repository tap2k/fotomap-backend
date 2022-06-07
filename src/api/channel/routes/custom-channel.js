'use strict';

module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getPublicChannels",
        handler: "channel.getPublicChannels",
        config: {
          auth: false,
        },
      },
      { 
        method: 'POST',
        path: '/createChannel', 
        handler: 'channel.createChannel',
      },
      { 
        method: 'POST',
        path: '/deleteChannel', 
        handler: 'channel.deleteChannel',
      },
    ],
  }
  