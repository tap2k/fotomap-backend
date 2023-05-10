'use strict';

/**
 * tag controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::tag.tag');

module.exports = createCoreController('api::tag.tag', ({ strapi }) =>  ({

    async getTags(ctx) {

        const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.query.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit ' + ctx.query.uniqueID);

        const myTags = await strapi.db.query('api::tag.tag').findMany({
            where: {
                $and: [
                    { channel: channel.id },
                    { contents: { $not: null } }
                ]
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

        let content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID },
            populate: { 
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                        editors: { select: ['id'] },
                    }
                },
            }
        });

        if (!content)
            return ctx.badRequest('No content provided');
        
        if (!strapi.config.functions.canEdit(content.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);

        let tag = await strapi.db.query('api::tag.tag').findOne({
            where: {
                    $and: [
                        { channel: content.channel.id },
                        { tag: ctx.request.body.tag },
                    ]
            },
        });

        if (!tag)
        {
            tag =  await strapi.db.query('api::tag.tag').create({
                data: {
                    tag: ctx.request.body.tag,
                    content: content.id,
                    channel: content.channel.id
                }
            });
        }

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

        let content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID },
            populate: { 
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                        editors: { select: ['id'] },
                    }
                },
            }
        });

        if (!content)
            return ctx.badRequest('No content provided');
        
        if (!strapi.config.functions.canEdit(content.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);

        let tag = await strapi.db.query('api::tag.tag').findOne({
            where: {
                    $and: [
                        { channel: content.channel.id },
                        { tag: ctx.request.body.tag },
                    ]
            },
        });

        if (!tag)
            return ctx.badRequest('No tag provided');

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

        const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit ' + ctx.request.body.uniqueID);
            
        let tagsource = await strapi.db.query('api::tag.tag').findOne({
            select: ['id'],
            where: {
                $and: [
                    { channel: channel.id },
                    { tag: ctx.request.body.tagsource },
                ]            
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
                $and: [
                    { channel: channel.id },
                    { tag: ctx.request.body.tagdest },
                ]            
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

        const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit ' + ctx.request.body.uniqueID);

        let tags = await strapi.db.query('api::tag.tag').findMany({
            select: ['id'],
            where: 
            { $and: [
                { channel: channel.id },
                { contents: null },
            ] },     
        });
        console.log(tags);
        for (const tag of tags) {
            strapi.service('api::tag.tag').delete(tag.id);
        }
        return "ok";
    },
}));
