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
        path: "/getContentItem",
        handler: "content.getContentItem",
      },
      {
        method: "POST",
        path: "/uploadContentToChannel",
        handler: "content.uploadContentToChannel",
      },
      {
        method: "POST",
        path: "/updateContent",
        handler: "content.updateContent",
      },
      {
        method: "POST",
        path: "/updateOrder",
        handler: "content.updateOrder",
      },
      {
        method: "POST",
        path: "/deleteContent",
        handler: "content.deleteContent",
      },
    ],
  }
  