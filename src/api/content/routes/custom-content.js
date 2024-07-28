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
        method: "GET",
        path: "/getAllContentForChannel",
        handler: "content.getAllContentForChannel",
      },
      /*{
        method: "POST",
        path: "/getContentItem",
        handler: "content.getContentItem",
      },*/
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
        path: "/deleteContent",
        handler: "content.deleteContent",
      },
      {
        method: "POST",
        path: "/uploadSubmission",
        handler: "content.uploadSubmission",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/updateSubmission",
        handler: "content.updateSubmission",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/deleteSubmission",
        handler: "content.deleteSubmission",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/uploadJSONToChannel",
        handler: "content.uploadJSONToChannel",
      },
      {
        method: "POST",
        path: "/addCaption",
        handler: "content.addCaption",
      },
    ],
  }
  