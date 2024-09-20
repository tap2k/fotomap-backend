module.exports = {
    routes: [
      /*{
        method: "GET",
        path: "/getTags",
        handler: "tag.getTags",
        config: {
          auth: false,
        },
      },*/
      {
        method: "POST",
        path: "/addTag",
        handler: "tag.addTag",
      },
      {
        method: "POST",
        path: "/removeTag",
        handler: "tag.removeTag",
      },
      {
        method: "POST",
        path: "/updateTag",
        handler: "tag.updateTag",
      },
      {
        method: "POST",
        path: "/deleteTag",
        handler: "tag.deleteTag",
      },
      {
        method: "POST",
        path: "/combineTags",
        handler: "tag.combineTags",
      },
      {
        method: "POST",
        path: "/purgeTags",
        handler: "tag.purgeTags",
      },
      {
        method: "POST",
        path: "/addSubmissionTag",
        handler: "tag.addSubmissionTag",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/removeSubmissionTag",
        handler: "tag.removeSubmissionTag",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/updateSubmissionTag",
        handler: "tag.updateSubmissionTag",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/combineSubmissionTags",
        handler: "tag.combineSubmissionTags",
        config: {
          auth: false,
        },
      },
      {
        method: "POST",
        path: "/purgeSubmissionTags",
        handler: "tag.purgeSubmissionTags",
        config: {
          auth: false,
        },
      },
    ],
  }