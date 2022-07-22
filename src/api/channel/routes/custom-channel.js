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
        method: "GET",
        path: "/getChannelsForProject",
        handler: "channel.getChannelsForProject",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/getMyChannels",
        handler: "channel.getMyChannels",
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
  