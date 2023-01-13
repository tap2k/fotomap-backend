'use strict';

module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getContentForChannel",
        handler: "content.getContentForChannel",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/uploadContentToChannel",
        handler: "content.uploadContentToChannel",
      },
      {
        method: "POST",
        path: "/deleteContent",
        handler: "content.deleteContent",
      },
    ],
  }
  