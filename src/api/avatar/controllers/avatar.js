'use strict';

/**
 *  avatar controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::avatar.avatar');

module.exports = createCoreController('api::avatar.avatar', ({ strapi }) =>  ({

    async getAvatar(ctx) {
        /*var platform = "All";
        if (ctx.query.platform)
            platform = ctx.query.platform;*/
        const myAvatar = await strapi.db.query('api::avatar.avatar').findOne({
            where: {
                owner: ctx.state.user.id,
                //platform: platform
            },
            populate: {
                pcbundle: {
                    select: ['id', 'url'],
                },
                androidbundle: {
                    select: ['id', 'url'],
                },
                webglbundle: {
                    select: ['id', 'url'],
                },
                macbundle: {
                    select: ['id', 'url'],
                },
                bundle: {
                    select: ['id', 'url'],
                },
            },
          });
        return myAvatar;
    },
    
    async uploadAvatar(ctx) {
        if (!ctx.request.files.bundle) 
            return ctx.badRequest('No avatar bundle specified');

        const platform = ctx.request.body.platform;
        
        var currentAvatar = await strapi.db.query('api::avatar.avatar').findOne({
            where: {
                owner: ctx.state.user.id,      
                //platform: "All"
            },
            select: ['id'],
            populate: {
                pcbundle: {
                    select: ['id', 'url'],
                },
                androidbundle: {
                    select: ['id', 'url'],
                },
                webglbundle: {
                    select: ['id', 'url'],
                },
                macbundle: {
                    select: ['id', 'url'],
                },
            },
        });

        var field = null;
        if (platform == "PC")
        {
            field = "pcbundle";
            if (currentAvatar && currentAvatar.pcbundle)
                await strapi.config.functions.deleteMediafile(currentAvatar.pcbundle.id)
        }
        if (platform == "Android")
        {
            field = "androidbundle";
            if (currentAvatar && currentAvatar.androidbundle)
                await strapi.config.functions.deleteMediafile(currentAvatar.androidbundle.id);
        }
        if (platform == "WebGL")
        {
            field = "webglbundle";
            if (currentAvatar && currentAvatar.webglbundle)
                await strapi.config.functions.deleteMediafile(currentAvatar.webglbundle.id);
        }
        if (platform == "Mac")
        {
            field = "macbundle";
            if (currentAvatar && currentAvatar.macbundle)
                await strapi.config.functions.deleteMediafile(currentAvatar.macbundle.id);
        }


        if (!currentAvatar)
            currentAvatar = await strapi.db.query('api::avatar.avatar').create({
                data: {
                    owner: ctx.state.user.id,
                    //platform: "All",
                },
            });

        if (!currentAvatar)
            return ctx.badRequest('Could not create avatar');

        const fs = require('fs');
        const stats = fs.statSync(ctx.request.files.bundle.path);
        //const mimetype = mime.getType(ctx.request.files.bundle.name);

        await strapi.config.functions.addFile(currentAvatar.id, 'api::avatar.avatar', ctx.request.files.bundle, field);

        return currentAvatar;
    },

    async deleteAvatar(ctx) {
        const avatar = await strapi.db.query('api::avatar.avatar').findOne({
            where: { 
                owner: ctx.state.user.id,
             },
             populate: {
                pcbundle: {
                    select: ['id', 'name', 'url'],
                },
                androidbundle: {
                    select: ['id', 'name', 'url'],
                },
                webglbundle: {
                    select: ['id', 'name', 'url'],
                },
                macbundle: {
                    select: ['id', 'name', 'url'],
                },
            },
        });

        if (!avatar)
            return ctx.badRequest('No such avatar: ' + ctx.request.body.id);
        
        await strapi.config.functions.deleteBundles(avatar);
        return await strapi.service('api::avatar.avatar').delete(avatar.id);
    },

    /*async convertAvatars(ctx) {
        const users = await strapi.db.query('plugin::users-permissions.user').findMany({
            select: ['id', 'username']
          });
        const platforms = ["PC", "Mac", "WebGL", "Android"];
        for (const user of users)
        {
          for (const platform of platforms)
            {
                const avatar = await strapi.db.query('api::avatar.avatar').findOne({
                    where: { 
                        owner: user.id,
                        platform: platform
                     },
                     populate: {
                        bundle: {
                            select: ['id'],
                            }
                        },
                });

                if (!avatar)
                    continue;

                console.log ("Converting avatar " + user.username + " " + platform)

                const currentAvatar = await strapi.db.query('api::avatar.avatar').findOne({
                    where: {
                        owner: user.id,            
                        platform: "All"
                    },
                    select: ['id']
                });

                var data = {
                    owner: user.id,
                    platform: "All"};
                if (platform == "PC")
                    data.pcbundle = avatar.bundle.id;
                if (platform == "Android")
                    data.androidbundle = avatar.bundle.id;
                if (platform == "WebGL")
                    data.webglbundle = avatar.bundle.id;
                if (platform == "Mac")
                    data.macbundle = avatar.bundle.id;
                if (currentAvatar)
                {
                    await strapi.query("api::avatar.avatar").update({ 
                        where: { id: currentAvatar.id },
                        data: data,
                    });
                }
                else
                    await strapi.db.query('api::avatar.avatar').create({data: data});
            }
        }
        return "ok";
    }*/
}));
