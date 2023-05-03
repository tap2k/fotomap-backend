'use strict';

/**
 *  content controller
 */

//const fs = require('fs');
//const mime = require('mime'); 
//const { createGzip } = require('zlib');

async function addFileFunc(content, file, key)
{
    if (!file)
        return null;

    if (file) {
        let path = file.path;
        let filename = file.name;

        const fs = require('fs');
        const mime = require('mime');
        const mimetype = mime.getType(filename);
        const stats = fs.statSync(path);

        return await strapi.plugins.upload.services.upload.upload({
            data: {
                refId: content.id,
                ref: 'api::content.content',
                field: key,
            },
            files: {
                path: path,
                name: filename,
                type: mimetype,
                size: stats.size
            }
        });
    }
}

async function createContentFunc(file, channelID, order, ext_url, lat, long) {
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

    if (file) {
        addFileFunc(content, file, "mediafile");
    }

    return content;
}

async function uploadContentFunc(ctx, channel)
{
    const contentItems = await strapi.db.query('api::content.content').findMany({
        where: { channel: channel.id },
        select: ['id', 'order'],
        orderBy: { order: 'asc' },
    });

    /*var order = ctx.request.body.order;
    if (!order)*/
    let order = 1;
    if (contentItems.length)
        order = parseInt(contentItems[contentItems.length - 1].order) + 1;

    strapi.config.functions.nullParam("lat", ctx.request.body);
    strapi.config.functions.nullParam("long", ctx.request.body);

    if (ctx.request.files && Object.keys(ctx.request.files).length) 
    {
        var files = ctx.request.files;
        let contents = [];
        for (const key of Object.keys(files)) {
            try {
                const content = await createContentFunc(files[key], channel.id, order, ctx.request.body.ext_url, ctx.request.body.lat, ctx.request.body.long);
                if (!content) return ctx.badRequest('Could not create content');
                order = order + 1;
                contents.push(content);
            }
            catch (error) {
                return ctx.badRequest(error);
            }
        };
        return contents;
    }
    else
    {
        const content = await createContentFunc(null, channel.id, order, ctx.request.body.ext_url, ctx.request.body.lat, ctx.request.body.long);
        if (!content) 
            return ctx.badRequest("Could not create content");
        else
            return [content];
    }
}

// TODO: Make sure its in order?
async function insertContentFunc(content, order) {

    if (order < -1)
        return;

    const contentItems = await strapi.db.query('api::content.content').findMany({
        where: { channel: content.channel.id },
        select: ['id', 'order'],
        orderBy: { order: 'asc' },
    });

    if (order == -1)
    {
        if (contentItems?.length)
            order = parseInt(contentItems[contentItems.length - 1].order) + 1;
        else
            order = 1;
    }
    
    var currOrder = 1;
    for (const updateContent of contentItems) {
        if (updateContent.id == content.id)
            continue;
        await strapi.query("api::content.content").update({
            where: { id: updateContent.id },
            data: { order: currOrder < order ? currOrder : parseInt(currOrder) + 1 },
        });
        currOrder = parseInt(currOrder) + 1;
    }

    return await strapi.query("api::content.content").update({
        where: { id: content.id },
        data: { order: Math.min(currOrder, order) }
    });
}

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::content.content');

module.exports = createCoreController('api::content.content', ({ strapi }) => ({

    async getAllContentForChannel(ctx) {
        const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.query.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit ' + ctx.query.uniqueID);
        
        const myContents = await strapi.db.query('api::content.content').findMany({
            where: {channel: {uniqueID: ctx.query.uniqueID}},
            orderBy: { order: 'asc' },
            populate: {
                mediafile: {
                    select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                },
                thumbnail: {
                    select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                    }
                },
                tags: {
                    select: ['id', 'tag'],
                },
            },
        });
        
        return myContents;
    },

    async getContentForChannel(ctx) {
        
        const myContents = await strapi.db.query('api::content.content').findMany({
            where: {
                $and: [{ channel: {uniqueID: ctx.query.uniqueID} },
                    { publishedAt: { $ne: null } }
                ]
            },
            orderBy: { order: 'asc' },
            populate: {
                mediafile: {
                    select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                },
                thumbnail: {
                    select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                    }
                },
                tags: {
                    select: ['id', 'tag'],
                },
            },
        });
        return myContents;
    },

    async uploadContentToChannel(ctx) {

        if (!ctx.request.body.ext_url && !ctx.request.files)
            return ctx.badRequest('No content specified');

        //TODO: Fix this! Or rely on moderation?
        //if (!channel.public && ctx.state.user.id != channel.owner.id);
        const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.request.body.uniqueID);

        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit ' + ctx.request.body.uniqueID);

        return await uploadContentFunc(ctx, channel);

    },

    async uploadSubmission(ctx) {

        if (!ctx.request.body.ext_url && !ctx.request.files)
            return ctx.badRequest('No content specified');
        
        const channel = await strapi.db.query('api::channel.channel').findOne({
                select: ['id', 'allowsubmissions'],
                where: { 
                    uniqueID: ctx.request.body.uniqueID,
                }
            });

        if (!channel?.allowsubmissions)
            return ctx.badRequest('This channel does not allow submissions ' + ctx.request.body.uniqueID);
        
        return await uploadContentFunc(ctx, channel);

    },

    /*async updateOrder(ctx) {
        if (!ctx.request.body.order || !ctx.request.body.contentID)
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
                        owner: { select: ['id'] },
                    }
                },
            }
        });

        if (!content)
            return ctx.badRequest('No content found for ' + ctx.request.body.contentID);

        if (content.channel.owner.id != ctx.state.user.id)
            return ctx.badRequest('No such channel or you are not the owner: ' + content.channel.uniqueID);

        if (content.order == ctx.request.body.order)
            return;

        await insertContentFunc(content, ctx.request.body.order);

        return "ok";
    },*/

    async updateContent(ctx) {
        if (!ctx.request.body.contentID)
            return ctx.badRequest('No content specified');
        
        const content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID },
            select: ['id', 'publishedAt'],
            populate: {
                mediafile: {
                    select: ['id'],
                },
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

        if (!content)
            return ctx.badRequest('No content found');

        if (!strapi.config.functions.canEdit(content.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);

        if (ctx.request.body.uniqueID)
        {
            const channel = await strapi.config.functions.getChannel(ctx.state.user.id, ctx.request.body.uniqueID);
            if (!channel)
                return ctx.badRequest('No such channel or you are not allowed to edit ' + ctx.request.body.uniqueID);
            //data["channel"] = {connect: [{id: channel.id}]};
            ctx.request.body["channel"] = {connect: [{id: channel.id}]};
        }

        strapi.config.functions.nullParam("lat", ctx.request.body);
        strapi.config.functions.nullParam("long", ctx.request.body);

        if (ctx.request.body.published != undefined)
        {
            if (ctx.request.body.published == "true")
            {
                if (!content.publishedAt)
                    ctx.request.body.publishedAt = new Date();
            }
            else
                ctx.request.body.publishedAt = null;
        }    

        const newcontent = await strapi.query("api::content.content").update({
            where: { id: content.id },
            data: ctx.request.body,
            //data: data,
            populate: {
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                    }
                },
                thumbnail: {
                    select: ['id'],
                },
            }
        });

        if (ctx.request.files && Object.keys(ctx.request.files).length)
        {
            if (newcontent.thumbnail?.id)
                await strapi.config.functions.deleteMediafile(newcontent.thumbnail.id);
            await addFileFunc(newcontent, ctx.request.files[Object.keys(ctx.request.files)], "thumbnail");
        }
        else
        {
            if (newcontent.thumbnail && ctx.request.body.deletepic)
                await strapi.config.functions.deleteMediafile(newcontent.thumbnail.id);
        }

        // TODO: ignore order if changing channel? yes
        if (ctx.request.body.uniqueID && (ctx.request.body.uniqueID != content.channel.uniqueID))
            await insertContentFunc(newcontent, -1);
        else if (ctx.request.body.order)
            await insertContentFunc(newcontent, ctx.request.body.order);

        if (ctx.request.body.caption && content.mediafile?.id)
            await strapi.plugins.upload.services.upload.update(content.mediafile.id, { caption: ctx.request.body.caption })
        
        //if (ctx.request.body.filename && content.mediafile?.id)
        //    await strapi.plugins.upload.services.upload.update(content.mediafile.id, { name: ctx.request.body.filename })

        //if (ctx.request.body.order && ctx.request.body.order != content.order)
        //    await strapi.controller('api::content.content').updateOrder(ctx);

        if (ctx.request.body.ext_url && content.mediafile)
            await strapi.config.functions.deleteMediafile(content.mediafile.id);

        return newcontent;
    },

    async deleteContent(ctx) {
        const content = await strapi.db.query('api::content.content').findOne({
            select: ['order'],
            where: {
                id: ctx.request.body.id,
            },
            populate: {
                mediafile: {
                    select: ['id'],
                },
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
            },
        });

        if (!content)
            return ctx.badRequest('No such content: ' + ctx.request.body.id);

        /*const channel = await strapi.config.functions.getChannel(ctx.state.user.id, content.channel.uniqueID);
        if (!channel)*/
        if (!strapi.config.functions.canEdit(content.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are allowed to edit: ' + content.channel.uniqueID);

        // TODO: check if content.order is undefined
        if (content.order && content.order > 0) {
            const contentItems = await strapi.db.query('api::content.content').findMany({
                where: {
                    $and: [
                        { channel: content.channel.id },
                        { order: { $gte: content.order } }
                    ]
                },
                select: ['id', 'order'],
                orderBy: { order: 'asc' },
            });

            for (const updateContent of contentItems) {
                await strapi.query("api::content.content").update({
                    where: { id: updateContent.id },
                    data: { order: updateContent.order - 1 },
                });
            }
        }

        if (content.mediafile)
            await strapi.config.functions.deleteMediafile(content.mediafile.id);
        
        
        if (content.thumbnail)
            await strapi.config.functions.deleteMediafile(content.thumbnail.id);

        return await strapi.service('api::content.content').delete(content.id);
    },

    async addCaption(ctx) {

        if (!ctx.request.body.caption || !ctx.request.body.contentID)
            return ctx.badRequest('No caption or content specified');

        const content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID },
            populate: {
                mediafile: {
                    select: ['id', 'caption'],
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

        if (!content)
            return ctx.badRequest('No content found');

        if (!strapi.config.functions.canEdit(content.channel, ctx.state.user.id))
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + content.channel.uniqueID);

        if (content.mediafile?.id)
            await strapi.plugins.upload.services.upload.update(content.mediafile.id, { caption: ctx.request.body.caption });

        return "ok";
    },

}));

//const { channel } = require('diagnostics_channel');

/*function processAudioSync(inputFilename, outputFilename){
    const ffmpeg = require('fluent-ffmpeg');
    //const tsebml = require('ts-ebml');
    return new Promise((resolve,reject)=>{
        var readStream = fs.createReadStream(inputFilename);
        //var writeStream = fs.createWriteStream(outputFilename);
        ffmpeg(readStream)
            .addOutputOptions('-movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov')
            .format('mp3')
            .save(outputFilename)
            .on('end', ()=>{
                return resolve()
            })
        .on('err',(err)=>{
            return reject(err)
        })
    })
}

    if (filename.endsWith(".wav"))
    {
        path = ctx.request.files.mediafile.path + '.mp3'
        filename = 'audio.mp3';
        await processAudioSync(ctx.request.files.mediafile.path, path);
    }

    if (filename.endsWith(".mp4"))
    {
        const decoder = new tsebml.Decoder();
        var readStream = fs.createReadStream(ctx.request.files.mediafile.path).on('data', (buf)=>{
            const ebmlElms = decoder.decode(buf);
            console.log(ebmlElms);
        });
    }
*/
