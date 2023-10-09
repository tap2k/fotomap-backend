'use strict';

/**
 * tag controller
 */

async function createTagFunc(tagtext, channel)
{
    if (channel.parent)
    {
        const parentChannel = await strapi.config.functions.getChannel(channel.parent.uniqueID);
        if (parentChannel)
            return await createTagFunc(tagtext, parentChannel);
        else 
            return null;
    }
    const tag = await strapi.db.query('api::tag.tag').findOne({
        where: { $and: [
                            { channel: channel.id },
                            { tag: tagtext },
                        ]
                },
    });

    if (tag)
        return tag;

    return await strapi.db.query('api::tag.tag').create({
        data: {
            tag: tagtext,
            channel: channel.id
        }
    });
}

async function getTagsFunc(channel)
{
    if (channel.parent)
        return await getTagsFunc(channel.parent);
    else
    {
        let myTags = await strapi.db.query('api::tag.tag').findMany({
            where: { channel: channel.id },
            orderBy: { tag: 'asc' },
            populate: {
                owner: { select: ['id'] },
                editors: { select: ['id'] },
                thumbnail: { select: ['url', 'formats'] },
                content: { select: ['id'] },
            },
        });
    
        return myTags;
    }
}

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::tag.tag');

module.exports = createCoreController('api::tag.tag', ({ strapi }) =>  ({

    async getTags(ctx) {
        const channel = await strapi.config.functions.getChannel(ctx.query.uniqueID);
        //const channel = await strapi.controller('api::channel.channel').getChannel(ctx);

        if (!channel)
            return ctx.badRequest('No such channel: ' + ctx.query.uniqueID);
        
        return await getTagsFunc(channel);
    },

    async addTag(ctx) {

        if ((!ctx.request.body.uniqueID && !ctx.request.body.contentID) || !ctx.request.body.tag)
            return ctx.badRequest('Content or channel orr tag not provided');

        if (ctx.request.body.uniqueID)
        {
            if (!strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id))
                return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);
            const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);
            const tag = await createTagFunc(ctx.request.body.tag, channel);

            if (!tag)
                return ctx.badRequest('Could not create tag: ' + ctx.request.body.tag);
            
            await strapi.db.query('api::channel.channel').update({
                where: { id: channel.id },
                data: {
                    tags: {
                        connect: 
                        [{
                            id: tag.id
                        }],
                    },
                },
            });

            return tag;
        }

        let content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID },
            populate: { 
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                        editors: { select: ['id'] },
                        parent: { select: ['id', 'uniqueID'] },
                    }
                },
            }
        });

        if (!content)
            return ctx.badRequest('No content provided');
        
        if (!strapi.config.functions.canEdit(content.channel.uniqueID, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);
        
        const tag = await createTagFunc(ctx.request.body.tag, content.channel);

        await strapi.db.query('api::content.content').update({
            where: { id: content.id },
            data: {
                tags: {
                    connect: [
                        {
                            id: tag.id
                        }
                    ],
                },
            },
        });

        return tag;
    },

    async removeTag(ctx) {

        let tagID = parseInt(ctx.request.body.tagID);
        if (isNaN(tagID))
            return ctx.badRequest('TagID not provided or is not a number: ' + ctx.request.body.tagID);
        
        let tag = await strapi.db.query('api::tag.tag').findOne({
            where: { id: tagID }
        });

        if (!tag)
            return ctx.badRequest('No such tag: ' + tagID);

        if (!ctx.request.body.uniqueID && !ctx.request.body.contentID)
            return ctx.badRequest('Content or channel not provided');

        if (ctx.request.body.uniqueID)
        {
            if (!strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id))
                return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);
            const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);
            return await strapi.db.query('api::channel.channel').update({
                where: { id: channel.id },
                data: {
                    tags: {
                        disconnect: 
                        [{
                            id: tag.id
                        }],
                    },
                },
            });
        }

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
        
        if (!strapi.config.functions.canEdit(content.channel.uniqueID, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);

        return await strapi.db.query('api::content.content').update({
            where: { id: content.id },
            data: {
                tags: {
                    disconnect: 
                    [{
                        id: tag.id
                    }],
                },
            },
        });
    },

    async combineTags(ctx) {

        if (!ctx.request.body.tagsourceID || !ctx.request.body.tagdestID)
            return ctx.badRequest('Source or dest tag not provided');
            
        const tagsource = await strapi.db.query('api::tag.tag').findOne({
            select: ['id'],
            where: { id: ctx.request.body.tagsourceID },
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

        if (!tagsource)
            return ctx.badRequest('Source tag not provided');

        const canEdit = await strapi.config.functions.canEdit(tagsource.channel.uniqueID, ctx.state.user.id);
        if (!canEdit) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);

        const tagdest = await strapi.db.query('api::tag.tag').findOne({
            select: ['id'],
            where: {
                $and: [
                    { channel: tagsource.channel.id },
                    { id: ctx.request.body.tagdestID },
                ]            
            },
        });

        if (!tagdest)
            return ctx.badRequest('Dest tag not provided or source and dest are different channels');


        const contents = await strapi.db.query('api::content.content').findMany({
            select: ['id'],
            where: { tags: tagsource.id },     
        });

        for (const content of contents) {
            const entry = await strapi.db.query('api::content.content').update({
                where: { id: content.id },
                data: {
                    tags: {
                        connect: 
                        [{
                            id: tagdest.id
                        }],
                    },
                },
            });
        }

        let channels = await strapi.db.query('api::channel.channel').findMany({
            select: ['id'],
            where: { tags: tagsource.id },     
        });

        for (const channel of channels) {
            const entry = await strapi.db.query('api::channel.channel').update({
                where: { id: channel.id },
                data: {
                    tags: {
                        connect: 
                        [{
                            id: tagdest.id
                        }],
                    },
                },
            });
        }

        if (tagsource.thumbnail)
            await strapi.config.functions.deleteMediafile(tagsource.thumbnail.id);
        await strapi.service('api::tag.tag').delete(tagsource.id);

        return "ok";
    },

    async deleteTag(ctx) {

        if (!ctx.request.body.tagID)
            return ctx.badRequest('No tag specified');

        const tagID = parseInt(ctx.request.body.tagID);
        if (isNaN(tagID))
            return ctx.badRequest('Tag ID is not a number');

        const tag = await strapi.db.query('api::tag.tag').findOne({
            where: { id: tagID },
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

        const canEdit = await strapi.config.functions.canEdit(tag.channel.uniqueID, ctx.state.user.id);
        if (!canEdit) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + tag.channel.uniqueID);

        if (tag.thumbnail)
            await strapi.config.functions.deleteMediafile(tag.thumbnail.id);
        return strapi.service('api::tag.tag').delete(tag.id);
    },

    async updateTag(ctx) {

        if (!ctx.request.body.tagID)
            return ctx.badRequest('No tag specified');

        const tagID = parseInt(ctx.request.body.tagID);
        if (isNaN(tagID))
            return ctx.badRequest('Tag ID is not a number: ' + ctx.request.body.tagID);

        const tag = await strapi.db.query('api::tag.tag').findOne({
            where: { id: tagID },
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

        const canEdit = await strapi.config.functions.canEdit(tag.channel.uniqueID, ctx.state.user.id);
        if (!canEdit) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + tag.channel.uniqueID);

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
            if (tag.thumbnail?.id)
                await strapi.config.functions.deleteMediafile(newtag.thumbnail.id);
            await strapi.config.functions.addFile(tag.id, 'api::tag.tag', ctx.request.files[Object.keys(ctx.request.files)], "thumbnail");
        }
        else
        {
            if (tag.thumbnail && ctx.request.body.deletepic == "true")
                await strapi.config.functions.deleteMediafile(newtag.thumbnail.id);
        }

        return newtag;
    },

    async purgeTags(ctx) {

        const canEdit = await strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id);
        if (!canEdit) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);

        const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);

        let tags = await getTagsFunc(channel);

        for (const tag of tags) {
            let channels = await strapi.db.query('api::channel.channel').findMany({
                select: ['id'],
                where: { tags: tag.id },     
            });
            let contents = await strapi.db.query('api::content.content').findMany({
                select: ['id'],
                where: { tags: tag.id },     
            });
            if (!channels.length && !contents.length)
            {
                if (tag.thumbnail)
                    await strapi.config.functions.deleteMediafile(tag.thumbnail.id);
                strapi.service('api::tag.tag').delete(tag.id);
            }
        }

        return "ok";
    },
}));
