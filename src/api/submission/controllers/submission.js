'use strict';

/**
 *  submission controller
 */

const fs = require('fs');
const mime = require('mime');
const ffmpeg = require('fluent-ffmpeg');
 
const { createCoreController } = require('@strapi/strapi').factories;

function processVideoSync(inputFilename, outputFilename){
    return new Promise((resolve,reject)=>{
        var readStream = fs.createReadStream(inputFilename);
        //var writeStream = fs.createWriteStream(outputFilename);
        ffmpeg(readStream)
        .addOutputOptions('-movflags +frag_keyframe+separate_moof+omit_tfhd_offset+empty_moov')
        .format('mp4')
        .save(outputFilename)
        .on('end', ()=>{
            return resolve()
        })
        .on('err',(err)=>{
            return reject(err)
        })
    })
}

module.exports = createCoreController('api::submission.submission', ({ strapi }) =>  ({
    async getSubmissionsForChannel(ctx) {
        const mySubmissions = await strapi.db.query('api::submission.submission').findMany({
            where: {
                publishedAt: { $not: null },
                channel: {
                  uniqueID: {
                    $eq: ctx.query.uniqueID
                  },}},
            select: ['id', 'lat', 'long'],
            populate: {
                mediafile: {
                    select: ['id', 'url'],
                    },
                },
          });
        return mySubmissions;
    },
    async uploadSubmissionToChannel(ctx) {

        const channel = await strapi.db.query('api::channel.channel').findOne({
            where: {
                uniqueID: { $eq: ctx.request.body.uniqueID},
            }
        });

        if (!channel) { return ctx.badRequest('No such channel: ' + ctx.request.uniqueID); };
        
        if (!ctx.request.files.mediafile) 
        { return ctx.badRequest('No submission specified'); };

        const submission = await strapi.db.query('api::submission.submission').create({
            data: {
                channel: channel.id,
                lat: ctx.request.body.lat,
                long: ctx.request.body.long,
            }
        });

        if (!submission) { return ctx.badRequest('Could not create submission') };

        if (ctx.request.files.mediafile)
        {   
            const outputFilename = ctx.request.files.mediafile.path + '.mp4';
            await processVideoSync(ctx.request.files.mediafile.path, outputFilename)
            const stats = fs.statSync(outputFilename);
            const mimetype = mime.getType(outputFilename);

            await strapi.plugins.upload.services.upload.upload({
                data: {
                    refId: submission.id,
                    ref: 'api::submission.submission',
                    field: 'mediafile',
                }, 
                files: {
                    path: outputFilename,
                    name: "upload.mp4",
                    type: mimetype,
                    size: stats.size
                }
            });
        }
        return "ok";
    },
}));

