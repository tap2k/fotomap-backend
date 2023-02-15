'use strict';

module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getSubmissions",
        handler: "submission.getSubmissions",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/getSubmissionsForTag",
        handler: "submission.getSubmissionsForTag",
        config: {
            auth: false,
          },
      },
      {
        method: "POST",
        path: "/uploadSubmissionToChannel",
        handler: "submission.uploadSubmissionToChannel",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/addCaption",
        handler: "submission.addCaption",
        config: {
          auth: false,
        },
      },
    ],
  }
  