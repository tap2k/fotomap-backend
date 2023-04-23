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
                contents: {
                    $not: null
                },
            },
            orderBy: { tag: 'asc' },
            /*populate: {
                contents: {
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
                tag: ctx.request.body.tag
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

        let content = await strapi.db.query('api::content.content').findOne({
                where: { id: ctx.request.body.contentID },
        });
        if (!content)
            return ctx.badRequest('No content provided');

        return await strapi.db.query('api::tag.tag').update({
            where: { id: tag.id },
            data: {
              contents: {
                connect: [
                  {
                    id: ctx.request.body.contentID
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
                tag: ctx.request.body.tag
            },
        });

        if (!tag)
            return ctx.badRequest('No tag provided');

        let content = await strapi.db.query('api::content.content').findOne({
                where: { id: ctx.request.body.contentID },
        });

        if (!content)
            return ctx.badRequest('No content provided');

        return await strapi.db.query('api::tag.tag').update({
            populate: true,
            where: { id: tag.id },
            data: {
              contents: {
                disconnect: 
                [{
                    id: ctx.request.body.contentID
                }],
              },
            },
          });
    },

    async combineTags(ctx) {
        let tagsource = await strapi.db.query('api::tag.tag').findOne({
            select: ['id'],
            where: {
                tag: ctx.request.body.tagsource
            },
            populate: {
                contents: {
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

        for (const content of tagsource.contents) {
            const entry1 = await strapi.db.query('api::tag.tag').update({
                where: { id: tagsource.id },
                data: {
                    contents: {
                        disconnect: 
                        [{
                            id: content.id
                        }],
                    },
                },
            });
            const entry2 = await strapi.db.query('api::tag.tag').update({
                where: { id: tagdest.id },
                data: {
                    contents: {
                        connect: 
                        [{
                            id: content.id
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
                contents: null
            }
        });
        for (const tag of tags) {
            strapi.service('api::tag.tag').delete(tag.id);
        }
        return "ok";
    },
}));
