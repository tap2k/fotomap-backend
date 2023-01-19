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
                    select: ['id', 'url'],
                    },
                },
          });
        return myContents;
    },

    async uploadContentToChannel(ctx) {
        const fs = require('fs');
        const mime = require('mime');

        if (!ctx.request.body.ext_url && !ctx.request.files.mediafile) 
            return ctx.badRequest('No content specified'); 

        const isMyChannel = await strapi.config.functions.isMyChannel(ctx.state.user.id, ctx.request.body.uniqueID);
        
        if (!isMyChannel) 
            return ctx.badRequest('No such channel or you are not the owner ' + ctx.request.body.uniqueID);
        
        //TODO: Fix this! Or rely on moderation?
        //if (!channel.public && ctx.state.user.id != channel.owner.id);

        var order = ctx.request.body.order;
        var numItems = -1;
        if (!order)
        {
            numItems = await strapi.query('api::content.content').count({ where: { channel: channel.id }});
            order = numItems + 1;
        }

        const content = await strapi.db.query('api::content.content').create({
            data: {
                channel: channel.id,
                order: order,
                ext_url: ctx.request.body.ext_url
            }
        });

        if (!content) 
            return ctx.badRequest('Could not create content');

        if (ctx.request.files.mediafile)
        {
            const stats = fs.statSync(ctx.request.files.mediafile.path);
            const mimetype = mime.getType(ctx.request.files.mediafile.name);

            await strapi.plugins.upload.services.upload.upload({
                data: {
                    refId: content.id,
                    ref: 'api::content.content',
                    field: 'mediafile',
                }, 
                files: {
                    path: ctx.request.files.mediafile.path,
                    name: ctx.request.files.mediafile.name,
                    type: mimetype,
                    size: stats.size
                }
            });
        }

        if (numItems == -1)
        {
            const contentItems = await strapi.db.query('api::content.content').findMany({
                where: {
                    $and: [
                    {channel: channel.id },
                    {order: { $gte: order}}
                    ]
                },
                select: ['id', 'order'],
                orderBy: { order: 'asc' },
            });
    
            for (const updateContent of contentItems) {
                if (updateContent.id != content.id) {
                    await strapi.query("api::content.content").update({ 
                        where: { id: updateContent.id },
                        data: { order: updateContent.order + 1 },
                    });
                }   
            }
        };
        return "ok";
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
            await strapi.plugins.upload.services.upload.remove(content.mediafile);

        return await strapi.service('api::content.content').delete(content.id);
    }
}));
