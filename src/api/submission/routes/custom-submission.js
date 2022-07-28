'use strict';

module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getSubmissionsForChannel",
        handler: "submission.getSubmissionsForChannel",
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
    ],
  }
  