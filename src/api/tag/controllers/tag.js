'use strict';

/**
 * tag controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::tag.tag');

module.exports = createCoreController('api::tag.tag', ({ strapi }) =>  ({

    async getTags(ctx) {
        const myTags = await strapi.db.query('api::tag.tag').findMany({
            select: ['id', 'tag'],
            where: {
                submissions: {
                    $not: null
                },
            },
            orderBy: { tag: 'asc' },
            /*populate: {
                submissions: {
                    select: ['id'],
                    },
            },*/
        });
        return myTags;    
    },

    async addTag(ctx) {
        let tag = await strapi.db.query('api::tag.tag').findOne({
            select: ['id', 'tag'],
            where: {
                tag: {
                    $eq: ctx.request.body.tag
                },
            },
        });
        if (!tag)
        {
            tag = await strapi.db.query('api::tag.tag').create({
                data: {
                    tag: ctx.request.body.tag
                }
            });
        }
        if (!tag)
            return null;

        let submission = await strapi.db.query('api::submission.submission').findOne({
                where: { id: ctx.request.body.submission },
        });
        if (!submission)
            return null;

        const entry = await strapi.db.query('api::tag.tag').update({
            where: { id: tag.id },
            data: {
              submissions: {
                connect: [
                  {
                    id: ctx.request.body.submission
                  }
                ],
              },
            },
          });
        return entry;
    },

    async deleteTag(ctx) {
        let tag = await strapi.db.query('api::tag.tag').findOne({
            select: ['id', 'tag'],
            where: {
                tag: {
                    $eq: ctx.request.body.tag
                },
            },
        });
        if (!tag)
            return null;

        let submission = await strapi.db.query('api::submission.submission').findOne({
                where: { id: ctx.request.body.submission },
        });
        if (!submission)
            return null;

        const entry = await strapi.db.query('api::tag.tag').update({
            populate: true,
            where: { id: tag.id },
            data: {
              submissions: {
                disconnect: [
                  {
                    id: ctx.request.body.submission
                  }
                ],
              },
            },
          });
        return entry;
    },

    async getSubmissionsForTag(ctx) {        
        //TODO: Verify user owns channel?
        let tag = await strapi.db.query('api::tag.tag').findOne({
            select: ['id', 'tag'],
            where: {
                tag: {
                    $eq: ctx.query.tag
                },
            },
            populate: {
                submissions: {
                    select: ['id', 'lat', 'long', 'createdAt'],
                    populate: {
                        mediafile: {
                            select: ['id', 'name', 'url', 'caption'],
                        },
                        tags: {
                            select: ['id', 'tag'],
                        },
                    }
                },            
            }
        });
        if (!tag)
            return [];
        return tag.submissions;
    },
}));
