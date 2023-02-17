'use strict';

/**
 *  content controller
 */

//const fs = require('fs');
//const mime = require('mime'); 
//const { createGzip } = require('zlib');

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::content.content');

module.exports = createCoreController('api::content.content', ({ strapi }) =>  ({

    async getContentForChannel(ctx) {
        const myContents = await strapi.db.query('api::content.content').findMany({
            where: {
                channel: {
                  uniqueID: {
                    $eq: ctx.query.uniqueID
                  },
                }
            },
            orderBy: { order: 'asc' },
            select: ['id', 'ext_url', 'is360', 'lat', 'long', 'mapping', 'packing'],
            populate: {
                mediafile: {
                    select: ['id', 'url', 'size', 'caption', 'name'],
                    },
                },
          });
        return myContents;
    },

    async uploadContentToChannel(ctx) {
        const fs = require('fs');
        const mime = require('mime');

        if (!ctx.request.body.ext_url && !ctx.request.files.mediafile && !ctx.request.files) 
            return ctx.badRequest('No content specified'); 

        const channelid = await strapi.config.functions.getChannelID(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channelid) 
            return ctx.badRequest('No such channel or you are not the owner ' + ctx.request.body.uniqueID);
        
        //TODO: Fix this! Or rely on moderation?
        //if (!channel.public && ctx.state.user.id != channel.owner.id);

        const contentItems = await strapi.db.query('api::content.content').findMany({
            where: { channel: channelid },
            select: ['id', 'order'],
            orderBy: { order: 'asc' },
        });

        var order = ctx.request.body.order;
        if (!order)
        {
            if (contentItems.length)
                order = contentItems[contentItems.length-1].order + 1;
            else
                order = 1;
        }
        const content = await strapi.db.query('api::content.content').create({
            data: {
                channel: channelid,
                order: order,
                ext_url: ctx.request.body.ext_url
            }
        });

        if (!content) 
            return ctx.badRequest('Could not create content');

        for (const updateContent of contentItems) {
            if (updateContent.id != content.id && updateContent.order == order) {
                order = order + 1;
                await strapi.query("api::content.content").update({ 
                    where: { id: updateContent.id },
                    data: { order: order },
                });
            }   
        }
    
        let file = ctx.request.files.mediafile;
        if (!file)
            file = ctx.request.files[Object.keys(ctx.request.files)[0]];

        if (file)
        {
            const stats = fs.statSync(file.path);
            const mimetype = mime.getType(file.name);

            await strapi.plugins.upload.services.upload.upload({
                data: {
                    refId: content.id,
                    ref: 'api::content.content',
                    field: 'mediafile',
                }, 
                files: {
                    path: file.path,
                    name: file.name,
                    type: mimetype,
                    size: stats.size
                }
            });
        }

        return "ok";
    },

    async updateOrder(ctx) {
        if (!ctx.request.body.order || !ctx.request.body.contentID) 
            return ctx.badRequest('No order or content specified'); 

        const channelid = await strapi.config.functions.getChannelID(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channelid) 
            return ctx.badRequest('No such channel or you are not the owner ' + ctx.request.body.uniqueID);
        
        const contentItems = await strapi.db.query('api::content.content').findMany({
            where: { channel: channelid },
            select: ['id', 'order'],
            orderBy: { order: 'asc' },
        });

        for (const updateContent of contentItems) {
            if (updateContent.id == ctx.request.body.contentID)
                await strapi.query("api::content.content").update({ 
                    where: { id: updateContent.id },
                    data: { order: order },
                });
            else if (updateContent.order == order) {
                order = order + 1;
                await strapi.query("api::content.content").update({ 
                    where: { id: updateContent.id },
                    data: { order: order },
                });
            }   
        }
    },

    async deleteContent(ctx) {
        const content = await strapi.db.query('api::content.content').findOne({
            where: { 
                id: ctx.request.body.id,
             },
             populate: {
                mediafile: {
                    select: ['id'],
                    },
                channel: {
                    select: ['id', 'uniqueID'],
                    },
                },
        });

        if (!content)
            return ctx.badRequest('No such content: ' + ctx.request.body.id);

        const channelid = await strapi.config.functions.getChannelID(ctx.state.user.id, content.channel.uniqueID);

        /*const channel = await strapi.db.query('api::channel.channel').findOne({
            select: ['uniqueID'],
            where: { 
                owner: ctx.state.user.id,
                uniqueID: content.channel.uniqueID
             },
        });
        if (!channel)
            return ctx.badRequest('No such channel or you are not the owner: ' + ctx.request.body.uniqueID);*/
        
        if (!channelid)
            return ctx.badRequest('No such channel or you are not the owner: ' + content.channel.uniqueID);

        if (content.mediafile)
            await strapi.config.functions.deleteMediafile(content.mediafile.id);

        return await strapi.service('api::content.content').delete(content.id);
    }
}));
