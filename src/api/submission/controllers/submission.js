'use strict';

/**
 *  submission controller
 */

const fs = require('fs');
const mime = require('mime');
const ffmpeg = require('fluent-ffmpeg');
//const tsebml = require('ts-ebml');
 
function processAudioSync(inputFilename, outputFilename){
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

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::submission.submission', ({ strapi }) =>  ({

    async getSubmissionsForChannel(ctx) {
        const mySubmissions = await strapi.db.query('api::submission.submission').findMany({
            where: {
                publishedAt: { $not: null },
                channel: {
                  uniqueID: {
                    $eq: ctx.query.uniqueID
                  },
                }
            },
            select: ['id', 'lat', 'long'],
            populate: {
                mediafile: {
                    select: ['id', 'name', 'url'],
                },
            },
        });
        return mySubmissions;
    },

    async uploadSubmissionToChannel(ctx) {
        if (!ctx.request.files.mediafile) 
            return ctx.badRequest('No submission specified');

        const channel = await strapi.db.query('api::channel.channel').findOne({
            where: {
                uniqueID: {$eq: ctx.request.body.uniqueID},
            }
        });

        // TODO: Need channel?
        // if (!channel) return ctx.badRequest('No such channel: ' + ctx.request.uniqueID);
        
        let channelID = null;
        if (channel)
            channelID = channel.id;

        const submission = await strapi.db.query('api::submission.submission').create({
            data: {
                channel: channelID,
                lat: ctx.request.body.lat,
                long: ctx.request.body.long,
            }
        });

        if (!submission) 
            return ctx.badRequest('Could not create submission');

        if (ctx.request.files.mediafile)
        {   
            let path = ctx.request.files.mediafile.path;
            let filename = ctx.request.files.mediafile.name;
            
            if (filename.endsWith("webm"))
            {
                path = ctx.request.files.mediafile.path + '.mp3'
                filename = 'audio.mp3';
                await processAudioSync(ctx.request.files.mediafile.path, path);
            }

            /*if (filename.endsWith("mp4"))
            {
                const decoder = new tsebml.Decoder();
                var readStream = fs.createReadStream(ctx.request.files.mediafile.path).on('data', (buf)=>{
                    const ebmlElms = decoder.decode(buf);
                    console.log(ebmlElms);
                });
            }*/

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
        }
        
        return "ok";
    },
}));

