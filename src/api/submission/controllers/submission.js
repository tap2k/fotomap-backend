'use strict';

const { debug } = require('console');
/**
 *  submission controller
 */

const fs = require('fs');
const mime = require('mime'); //used to detect file's mime type
 
const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::submission.submission', ({ strapi }) =>  ({
    async getSubmissionsForChannel(ctx) {
        const mySubmissions = await strapi.db.query('api::submission.submission').findMany({
            where: {
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
            const stats = fs.statSync(ctx.request.files.mediafile.path);
            const mimetype = mime.getType(ctx.request.files.mediafile.name);

            await strapi.plugins.upload.services.upload.upload({
                data: {
                    refId: submission.id,
                    ref: 'api::submission.submission',
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
        return "ok";
    },
}));

