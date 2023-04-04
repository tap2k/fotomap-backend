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
            return ctx.badRequest('Couldnt create tag');

        let submission = await strapi.db.query('api::submission.submission').findOne({
                where: { id: ctx.request.body.submission },
        });
        if (!submission)
            return ctx.badRequest('No submission provided');

        return await strapi.db.query('api::tag.tag').update({
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
    },

    async removeTag(ctx) {
        let tag = await strapi.db.query('api::tag.tag').findOne({
            select: ['id', 'tag'],
            where: {
                tag: {
                    $eq: ctx.request.body.tag
                },
            },
        });

        if (!tag)
            return ctx.badRequest('No tag provided');

        let submission = await strapi.db.query('api::submission.submission').findOne({
                where: { id: ctx.request.body.submission },
        });

        if (!submission)
            return ctx.badRequest('No submission provided');

        return await strapi.db.query('api::tag.tag').update({
            populate: true,
            where: { id: tag.id },
            data: {
              submissions: {
                disconnect: 
                [{
                    id: ctx.request.body.submission
                }],
              },
            },
          });
    },

    async combineTags(ctx) {
        let tagsource = await strapi.db.query('api::tag.tag').findOne({
            select: ['id'],
            where: {
                tag: {
                    $eq: ctx.request.body.tagsource
                },
            },
            populate: {
                submissions: {
                    select: ['id'],
                    },
            },
        });

        let tagdest = await strapi.db.query('api::tag.tag').findOne({
            select: ['id'],
            where: {
                tag: {
                    $eq: ctx.request.body.tagdest
                },
            },
        });

        if (!tagsource || !tagdest)
            return ctx.badRequest('Source or dest tag not provided');

        for (const submission of tagsource.submissions) {
            const entry1 = await strapi.db.query('api::tag.tag').update({
                where: { id: tagsource.id },
                data: {
                    submissions: {
                        disconnect: 
                        [{
                            id: submission.id
                        }],
                    },
                },
            });
            const entry2 = await strapi.db.query('api::tag.tag').update({
                where: { id: tagdest.id },
                data: {
                    submissions: {
                        connect: 
                        [{
                            id: submission.id
                        }],
                    },
                },
            });
        }

        await strapi.service('api::tag.tag').delete(tagsource.id);

        return "ok";
    },

    async purgeTags(ctx) {
        let tags = await strapi.db.query('api::tag.tag').findMany({
            select: ['id'],
            where: {
                submissions: null
            }
        });
        for (const tag of tags) {
            strapi.service('api::tag.tag').delete(tag.id);
        }
        return "ok";
    },
}));
