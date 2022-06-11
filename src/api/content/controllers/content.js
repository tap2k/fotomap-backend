'use strict';

/**
 *  content controller
 */

const fs = require('fs');
const mime = require('mime'); //used to detect file's mime type
const formData = require('form-data');
const { createGzip } = require('zlib');
const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::content.content');

module.exports = createCoreController('api::content.content', ({ strapi }) =>  ({
    async getContentForChannel(ctx) {
        const myContents = await strapi.db.query('api::content.content').findMany({
            where: {
                channel: {
                  uniqueID: {
                    $eq: ctx.query.uniqueID
                  },}},
            orderBy: { order: 'asc' },
            select: ['id', 'ext_url'],
            populate: {
                mediafile: {
                    select: ['id', 'url'],
                    },
                },
          });
        return myContents;
    },
    async uploadContentToChannel(ctx) {
        
        console.log("Request Files = " + JSON.stringify(ctx.request.files));
        console.log("File = " + JSON.stringify(ctx.request.files.mediafile));
        console.log("UniqueID = " + JSON.stringify(ctx.request.body.uniqueID));

        const channel = await strapi.db.query('api::channel.channel').findOne({
            where: {
                uniqueID: { $eq: ctx.request.body.uniqueID},
            },});
        
        if (!channel) { return ctx.badRequest('No such channel: ' + ctx.request.uniqueID); };
        if (ctx.state.id != channel.owner) { return ctx.badRequest('You do not own this channel'); };
        console.log ("Channel Name = " + channel.name);
        
        if (!ctx.request.body.ext_url && !ctx.request.files.mediafile) 
        { return ctx.badRequest('No content specified'); };

        var order = ctx.request.body.order;
        var numItems = -1;
        if (!order)
        {
            var numItems = await strapi.query('api::content.content').count({ where: { channel: channel.id }});
            console.log ("Num Items = " + numItems);
            order = numItems + 1;
        }

        const content = await strapi.db.query('api::content.content').create({
            data: {
                channel: channel.id,
                order: order,
                ext_url: ctx.request.body.ext_url
            }
        });

        if (!content) { return ctx.badRequest('Could not create content') };
        console.log("Content ID = " + content.id);

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
                select: ['id'],
                orderBy: { order: 'asc' },
            });
    
            var currentOrder = order;
            for (const updateContent of contentItems) {
                if (updateContent.id != content.id) {
                currentOrder++;
                console.log("Updating Content ID = " + updateContent.id + "Order = " + currentOrder);
                await strapi.query("api::content.content").update({ 
                    where: { id: updateContent.id },
                    data: { order: currentOrder },
                });}   
            }
        };
        return "ok";
    },
}));