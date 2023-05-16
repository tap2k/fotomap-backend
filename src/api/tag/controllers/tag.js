'use strict';

/**
 * tag controller
 */

async function getTagsFunc(channel)
{
    let myTags = await strapi.db.query('api::tag.tag').findMany({
        where: {
            $and: [
                { channel: channel.id },
                { contents: { $not: null } }
            ]
        },
        orderBy: { tag: 'asc' },
        populate: {
            owner: { select: ['id'] },
            editors: { select: ['id'] },
            thumbnail: { select: ['url', 'formats'] },
            contents: { select: ['id'] },
        },
    });

    if (channel.parent)
        myTags = myTags.concat(await getTagsFunc(channel.parent));
    
    return myTags;
}

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::tag.tag');

module.exports = createCoreController('api::tag.tag', ({ strapi }) =>  ({

    async getTags(ctx) {
        const channel = await strapi.controller('api::channel.channel').getChannel(ctx);
        //const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.query.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel: ' + ctx.query.uniqueID);
        
        return await getTagsFunc(channel);
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
        
        let tagID = parseInt(ctx.request.body.tagID);
        if (isNaN(tagID))
            tagID = null;

        if (!strapi.config.functions.canEdit(content.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);

        let tag = await strapi.db.query('api::tag.tag').findOne({
            where: {
                    $or: [
                            {$and: [
                                { channel: content.channel.id },
                                { tag: ctx.request.body.tag },
                            ]},
                            { id: tagID }
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

        let tagID = parseInt(ctx.request.body.tagID);
        if (isNaN(tagID))
            tagID = null;

        let tag = await strapi.db.query('api::tag.tag').findOne({
            where: {
                $or: [
                    {$and: [
                        { channel: content.channel.id },
                        { tag: ctx.request.body.tag },
                    ]},
                    { id: tagID }
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

    async updateTag(ctx) {
        if (!ctx.request.body.tag)
            return ctx.badRequest('No tag specified');
    
        const tag = await strapi.db.query('api::tag.tag').findOne({
            where: { tag: ctx.request.body.tag },
            populate: {
                thumbnail: {
                    select: ['id'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                        editors: { select: ['id'] },
                    }
                },
            }
    });

        if (!tag)
            return ctx.badRequest('No tag found');

        if (!strapi.config.functions.canEdit(tag.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);

        const newtag = await strapi.query("api::tag.tag").update({
            where: { id: tag.id },
            data: ctx.request.body,
            populate: {
                thumbnail: {
                    select: ['id'],
                },
            }
        });
            
        if (ctx.request.files && Object.keys(ctx.request.files).length)
        {
            if (newtag.thumbnail?.id)
                await strapi.config.functions.deleteMediafile(newtag.thumbnail.id);
            await strapi.config.functions.addFile(tag.id, 'api::tag.tag', ctx.request.files[Object.keys(ctx.request.files)], "thumbnail");
        }
        else
        {
            if (newtag.thumbnail && ctx.request.body.deletepic == "true")
                await strapi.config.functions.deleteMediafile(newtag.thumbnail.id);
        }

        return newtag;
    },

    async purgeTags(ctx) {

        const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit ' + ctx.request.body.uniqueID);

        let tags = await strapi.db.query('api::tag.tag').findMany({
            select: ['id'],
            populate: {
                owner: { select: ['id'] },
                editors: { select: ['id'] },
            },
            where: {$and: [
                { channel: channel.id },
                { contents: null },
            ]},     
        });

        for (const tag of tags) {
            if (tag.thumbnail)
                await strapi.config.functions.deleteMediafile(tag.thumbnail.id);
            strapi.service('api::tag.tag').delete(tag.id);
        }
        return "ok";
    },
}));
