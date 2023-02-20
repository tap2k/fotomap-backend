'use strict';

/**
 *  content controller
 */

//const fs = require('fs');
//const mime = require('mime'); 
//const { createGzip } = require('zlib');

async function createContent(file, channelID, order, ext_url, lat, long)
{
    if (!channelID)
        return null;

    const content = await strapi.db.query('api::content.content').create({
        data: {
            channel: channelID,
            order: order,
            ext_url: ext_url,
            lat: lat,
            long: long,
        }
    });

    if (!content) 
        return null;
    
    if (file)
    {
        let path = file.path;
        let filename = file.name;
        
        const fs = require('fs');
        const mime = require('mime');
        const mimetype = mime.getType(filename);
        const stats = fs.statSync(path);

        await strapi.plugins.upload.services.upload.upload({
            data: {
                refId: content.id,
                ref: 'api::content.content',
                field: 'mediafile',
            }, 
            files: {
                path: path,
                name: filename,
                type: mimetype,
                size: stats.size
            }
        });
    }       

    return content;
}

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
                    select: ['id', 'name', 'url', 'size', 'caption'],
                    },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id']},
                    }
                },
            },
          });
        return myContents;
    },

    async getContentItem(ctx) {
        if (!ctx.request.body.contentID) 
            return ctx.badRequest('No content specified'); 
        
        const content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID },
            select: ['id', 'ext_url', 'is360', 'lat', 'long', 'mapping', 'packing'],
            populate: {
                mediafile: {
                    select: ['id', 'name', 'url', 'size', 'caption'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id']},
                    }
                },
            }
        });

        if (!content)
            return ctx.badRequest('No content found for ' + ctx.request.body.contentID);
            
        if (content.channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('No such channel or you are not the owner: ' + content.channel.uniqueID);
        
        return content;
    },

    async uploadContentToChannel(ctx) {

        if (!ctx.request.body.ext_url && !ctx.request.files) 
            return ctx.badRequest('No content specified'); 
        
        const channelID = await strapi.config.functions.getChannelID(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channelID) 
            return ctx.badRequest('No such channel or you are not the owner ' + ctx.request.body.uniqueID);
        
        //TODO: Fix this! Or rely on moderation?
        //if (!channel.public && ctx.state.user.id != channel.owner.id);

        const contentItems = await strapi.db.query('api::content.content').findMany({
            where: { channel: channelID },
            select: ['id', 'order'],
            orderBy: { order: 'asc' },
        });

        /*var order = ctx.request.body.order;
        if (!order)*/
        let order = 1;
        if (contentItems.length)
            order = contentItems[contentItems.length-1].order + 1;

        if (ctx.request.files)
        {
            var files = ctx.request.files;
        
            //Object.keys(files).forEach(await async key => {
            for (const key of Object.keys(files)) {
                try { 
                    const content = await createContent(files[key], channelID, order, ctx.request.body.ext_url, ctx.request.body.lat, ctx.request.body.long);
                    if (!content) return ctx.badRequest('Could not create content');
                    order = order + 1;
                }
                catch (error) {
                    return ctx.badRequest(error);
                }
            };
        }
        else
            await createContent(null, channelID, order, ctx.request.body.ext_url, ctx.request.body.lat, ctx.request.body.long);

        /*for (const updateContent of contentItems) {
            if (updateContent.id != content.id && updateContent.order == order) {
                order = order + 1;
                await strapi.query("api::content.content").update({ 
                    where: { id: updateContent.id },
                    data: { order: order },
                });
            }   
        }*/

        return "ok";
    },

    async updateOrder(ctx) {
        if (!ctx.request.body.order || !ctx.request.body.contentID) 
            return ctx.badRequest('No order or content specified'); 
        
        const content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID},
            populate: {
                mediafile: {
                    select: ['id'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id']},
                    }
                },                
            }
        });

        if (!content)
            return ctx.badRequest('No content found for ' + ctx.request.body.contentID);
            
        if (content.channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('No such channel or you are not the owner: ' + content.channel.uniqueID);

        const contentItems = await strapi.db.query('api::content.content').findMany({
            where: { channel: content.channel.id },
            select: ['id', 'order'],
            orderBy: { order: 'asc' },
        });
        
        let currOrder = parseInt(ctx.request.body.order);
        for (const updateContent of contentItems) {
            console.log("update order = " + updateContent.order + " curr order = " + currOrder);
            if (updateContent.id == ctx.request.body.contentID)
                await strapi.query("api::content.content").update({ 
                    where: { id: updateContent.id },
                    data: { order: ctx.request.body.order },
                });
            else if (parseInt(updateContent.order) == currOrder) {
                console.log("updating");
                await strapi.query("api::content.content").update({ 
                    where: { id: updateContent.id },
                    data: { order: currOrder + 1 },
                });
                currOrder = currOrder + 1;
            }   
        }

        return "ok";
    },

    async updateContent(ctx) {
        if (!ctx.request.body.contentID) 
            return ctx.badRequest('No order or content specified'); 
        
        const content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID },
            populate: {
                mediafile: {
                    select: ['id'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id']},
                    }
                },
            }
        });

        if (!content)
            return ctx.badRequest('No content found for ' + ctx.request.body.contentID);
            
        if (content.channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('No such channel or you are not the owner: ' + content.channel.uniqueID);
        
        let data = {};
        if (ctx.request.body.lat)
            data["lat"] = ctx.request.body.lat;
        if (ctx.request.body.long)
            data["long"] = ctx.request.body.long;
        if (ctx.request.body.is360)
            data["is360"] = ctx.request.body.is360;
        if (ctx.request.body.mapping)
            data["mapping"] = ctx.request.body.mapping;
        if (ctx.request.body.packing)
            data["packing"] = ctx.request.body.packing;
        if (ctx.request.body.ext_url)
            data["ext_url"] = ctx.request.ext_url;

        await strapi.query("api::content.content").update({ 
            where: { id: content.id },
            data: data,
        });

        if (ctx.request.body.caption)
            await strapi.controller('api::content.content').addCaption(ctx);

        if (ctx.request.body.order && ctx.request.body.order != content.order)
            await strapi.controller('api::content.content').updateOrder(ctx);

        if (ctx.request.body.ext_url && content.mediafile)
            await strapi.config.functions.deleteMediafile(content.mediafile.id);
        
        return "ok";
    },
    
    async addCaption(ctx) {

        if (!ctx.request.body.caption || !ctx.request.body.contentID)  
            return ctx.badRequest('No caption or content specified');

        const content = await strapi.db.query('api::content.content').findOne({ 
            where: { id: ctx.request.body.contentID },
            populate: {
                mediafile : {
                    select: ['id', 'caption'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id']},
                    }
                },
            }
        });

        if (!content)
            return ctx.badRequest('No content found');
        
        if (content.channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('No such channel or you are not the owner: ' + content.channel.uniqueID);
        
        if (content.mediafile?.id)
            await strapi.plugins.upload.services.upload.update(content.mediafile.id, { caption: ctx.request.body.caption });

        return "ok";
    },

    async deleteContent(ctx) {
        const content = await strapi.db.query('api::content.content').findOne({
            select: [ 'order' ],
            where: { 
                id: ctx.request.body.id,
             },
             populate: {
                mediafile: {
                    select: ['id'],
                    },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id']},
                    }
                },
            },
        });

        if (!content)
            return ctx.badRequest('No such content: ' + ctx.request.body.id);

        /*const channelID = await strapi.config.functions.getChannelID(ctx.state.user.id, content.channel.uniqueID);
        if (!channelID)*/
        if (content.channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('No such channel or you are not the owner: ' + content.channel.uniqueID);
        
        // TODO: check if content.order is undefined
        if (content.order && content.order > 0)
        {
            const contentItems = await strapi.db.query('api::content.content').findMany({
                where: { 
                    $and: [
                        {channel: content.channel.id},
                        {order: {$gte: content.order}}
                    ]
                },
                select: ['id', 'order'],
                orderBy: { order: 'asc' },
            });

            for (const updateContent of contentItems) {
                await strapi.query("api::content.content").update({ 
                    where: { id: updateContent.id },
                    data: { order: updateContent.order - 1},
                });
            }
        }

        if (content.mediafile)
            await strapi.config.functions.deleteMediafile(content.mediafile.id);

        return await strapi.service('api::content.content').delete(content.id);
    }, 

}));
