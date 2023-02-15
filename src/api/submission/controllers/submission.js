'use strict';

/**
 *  submission controller
 */
 
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
}*/

async function createSubmission(file, channel, lat, long)
{
    let channelID = null;
    if (channel)
        channelID = channel.id;

    const submission = await strapi.db.query('api::submission.submission').create({
        data: {
            channel: channelID,
            lat: lat,
            long: long,
        }
    });

    if (!submission) 
        return null;

    let path = file.path;
    let filename = file.name;
    
    /*if (filename.endsWith(".wav"))
    {
        path = ctx.request.files.mediafile.path + '.mp3'
        filename = 'audio.mp3';
        await processAudioSync(ctx.request.files.mediafile.path, path);
    }*/

    /*if (filename.endsWith(".mp4"))
    {
        const decoder = new tsebml.Decoder();
        var readStream = fs.createReadStream(ctx.request.files.mediafile.path).on('data', (buf)=>{
            const ebmlElms = decoder.decode(buf);
            console.log(ebmlElms);
        });
    }*/

    const fs = require('fs');
    const mime = require('mime');
    const mimetype = mime.getType(filename);
    const stats = fs.statSync(path);

    await strapi.plugins.upload.services.upload.upload({
        data: {
            refId: submission.id,
            ref: 'api::submission.submission',
            field: 'mediafile',
        }, 
        files: {
            path: path,
            name: filename,
            type: mimetype,
            size: stats.size
        }
    });

    return submission;
}

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::submission.submission');

module.exports = createCoreController('api::submission.submission', ({ strapi }) =>  ({

    async getSubmissions(ctx) {
        //TODO: Verify super user?

        /*if (!ctx.query.uniqueID || ctx.query.uniqueID == 'undefined')
            return await strapi.controller('api::submission.submission').getSubmissions(ctx);*/

        if (ctx.query.tag)
            return await strapi.controller('api::submission.submission').getSubmissionsForTag(ctx);
        
        //TODO: Verify user owns channel?
        var channelid = ctx.query.uniqueID;
        var whereclause = {publishedAt: {$not: null}};
        if (ctx.query.uniqueID)
            whereclause["channel"] = {uniqueID: {$eq: channelid}};

        const mySubmissions = await strapi.db.query('api::submission.submission').findMany({
            where: whereclause,
            select: ['id', 'lat', 'long', 'createdAt'],
            orderBy: { createdAt: 'desc' },
            populate: {
                mediafile: {
                    select: ['id', 'name', 'url', 'caption'],
                },
                tags: {
                    select: ['id', 'tag'],
                },
            },
        });
        return mySubmissions;
    },

    async getSubmissionsForTag(ctx) { 
        //var whereclause = {channel: {uniqueID: {$eq: "tap2k"}}};       
        var whereclause = {publishedAt: {$not: null}};
        if (ctx.query.uniqueID)
            whereclause = {$and: [whereclause, {channel: {uniqueID: {$eq: ctx.query.uniqueID}}}]};
        let tag = await strapi.db.query('api::tag.tag').findOne({
            select: ['id', 'tag'],
            where: {
                tag: {
                    $eq: ctx.query.tag
                },
            },
            populate: {
                submissions: {
                    select: ['id', 'lat', 'long', 'createdAt'],
                    where: whereclause,
                    populate: {
                        mediafile: {
                            select: ['id', 'name', 'url', 'caption'],
                        },
                        tags: {
                            select: ['id', 'tag'],
                        },
                    },
                },            
            }
        });
        if (!tag)
            return [];
        return tag.submissions;
    },
    
    async uploadSubmissionToChannel(ctx) {

        if (!ctx.request.files)  
            return ctx.badRequest('No submission specified');

        const channel = await strapi.db.query('api::channel.channel').findOne({
            where: {
                uniqueID: {$eq: ctx.request.body.uniqueID},
            }
        });

        // TODO: Need channel?
        // if (!channel) return ctx.badRequest('No such channel: ' + ctx.request.uniqueID);
        var files = ctx.request.files;
        
        Object.keys(files).forEach(key => {
            try { 
                var submission = createSubmission(files[key], channel, ctx.request.body.lat, ctx.request.body.long);
                if (!submission) return ctx.badRequest('Could not create submission');
            }
            catch (error) {
                return ctx.badRequest(error);
            }
        });

        return "ok";
    },

    async addCaption(ctx) {

        if (!ctx.request.body.caption || !ctx.request.body.submission)  
            return ctx.badRequest('No caption or submission specified');

        const submission = await strapi.db.query('api::submission.submission').findOne({ 
            where: { id: ctx.request.body.submission },
            populate: {
                mediafile : {
                    select: ['id', 'name', 'url', 'caption'],
                }
            }
        });

        if (!submission)
            return ctx.badRequest('No submission specified');
        
        if (submission.mediafile?.id)
        {
            await strapi.plugins.upload.services.upload.update(submission.mediafile.id, 
            { caption: ctx.request.body.caption });
        }

        return "ok";
    },    
}));

