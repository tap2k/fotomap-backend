'use strict';

/**
 *  project controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::project.project');

module.exports = createCoreController('api::project.project', ({ strapi }) =>  ({
    async getMyProjects(ctx) {
        const projects = await strapi.query('api::project.project').findMany({
            select: ['uniqueID', 'name'],
            where: { owner: ctx.state.user.id },
        });
        return projects;
    },
    async getPublicProjects(ctx) {
        const projects = await strapi.query('api::project.project').findMany({
            select: ['uniqueID', 'name'],
            where: { public: 'true' },
          });
        return projects;
    },
    async getProject(ctx) {
        const project = await strapi.query('api::project.project').findOne({
            select: ['uniqueID', 'name', 'lat', 'long', 'zoom'],
            where: { uniqueID: ctx.query.uniqueID },
          });
        return project;
    },
    async createProject(ctx) {
        const uuid = require('uuid');
        var myuuid = uuid.v4().substring(0,8);
        const project = await strapi.query('api::project.project').create({
            data: {
                uniqueID: myuuid,
                name: ctx.request.body.name,
                public: ctx.request.body.public,
                owner: ctx.state.user.id,
                lat: ctx.request.body.lat,
                long: ctx.request.body.long,
                zoom: ctx.request.body.zoom,
              },
            });
        return project;
    },
    async deleteProject(ctx) {
        const project = await strapi.query('api::project.project').findOne({
            select: ['uniqueID'],
            where: { 
                owner: ctx.state.user.id,
                uniqueID: ctx.request.body.uniqueID
             }});
        if (project == undefined)
            return ctx.badRequest('No such project or you are not the owner: ' + ctx.request.body.uniqueID);
        var channels = await strapi.query("api::channel.channel").findMany({ 
                select: ['uniqueID'],
                where: { project: { uniqueID: ctx.request.body.uniqueID } },
            });
        for (const channel of channels) {
            console.log("uniqueID = " + channel.uniqueID);
            await strapi.service('api::channel.channel').deleteChannel(ctx, channel.uniqueID);
            //await strapi.query("api::channel.channel").deleteChannel({ where: { uniqueID: ctx.request.body.uniqueID }});
        };
        return await strapi.query("api::project.project").delete({ where: { uniqueID: ctx.request.body.uniqueID } });
    }
}));

