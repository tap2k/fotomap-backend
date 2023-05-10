'use strict';

module.exports = {
  routes: [
    {
      method: "GET",
      path: "/getOverlay",
      handler: "overlay.getOverlay",
      config: {
        auth: false,
      },
    },
    { 
      method: 'POST',
      path: '/deleteOverlay', 
      handler: 'overlay.deleteOverlay',
    },
    { 
        method: 'POST',
        path: '/updateOverlay', 
        handler: 'overlay.updateOverlay',
    },
    { 
        method: 'POST',
        path: '/uploadOverlay', 
        handler: 'overlay.uploadOverlay',
    },
  ]
}