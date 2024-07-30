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
      path: "/getMyChannels",
      handler: "channel.getMyChannels",
    },
    {
      method: "GET",
      path: "/getChildChannels",
      handler: "channel.getChildChannels",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/getChannel",
      handler: "channel.getChannel",
      config: {
        auth: false,
      },
    },
    {
      method: "GET",
      path: "/getMyChannel",
      handler: "channel.getMyChannel",
    },
    { 
      method: 'POST',
      path: '/createChannel', 
      handler: 'channel.createChannel'
    },
    {
      method: "POST",
      path: "/updateChannel",
      handler: "channel.updateChannel",
    },
    { 
      method: 'POST',
      path: '/deleteChannel', 
      handler: 'channel.deleteChannel',
    },
    { 
      method: 'POST',
      path: '/createSubmissionChannel', 
      handler: 'channel.createSubmissionChannel',
      config: {
        auth: false,
      },
    },
    { 
      method: 'GET',
      path: '/getSubmissionChannel', 
      handler: 'channel.getSubmissionChannel',
      config: {
        auth: false,
      },
    },
    { 
      method: 'POST',
      path: '/updateSubmissionChannel', 
      handler: 'channel.updateSubmissionChannel',
      config: {
        auth: false,
      },
    },
    { 
      method: 'POST',
      path: '/deleteSubmissionChannel', 
      handler: 'channel.deleteSubmissionChannel',
      config: {
        auth: false,
      },
    },
    { 
      method: 'POST',
      path: '/regenChannelID', 
      handler: 'channel.regenChannelID',
    },
    { 
      method: 'POST',
      path: '/addEditor', 
      handler: 'channel.addEditor',
    },
    { 
      method: 'POST',
      path: '/removeEditor', 
      handler: 'channel.removeEditor',
    },
  ],
}
  