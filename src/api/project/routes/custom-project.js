'use strict';

module.exports = {
    routes: [
      {
        method: "GET",
        path: "/getPublicProjects",
        handler: "project.getPublicProjects",
        config: {
          auth: false,
        },
      },
      {
        method: "GET",
        path: "/getMyProjects",
        handler: "project.getMyProjects",
      },
      {
        method: "GET",
        path: "/getProject",
        handler: "project.getProject",
        config: {
          auth: false,
        },
      },
      { 
        method: 'POST',
        path: '/createProject', 
        handler: 'project.createProject',
      },
      { 
        method: 'POST',
        path: '/deleteProject', 
        handler: 'project.deleteProject',
      },
    ],
  }