'use strict';

/**
 *  content controller
 */

const fs = require('fs');
const mime = require('mime');
//const axios = require('axios');
//const { createGzip } = require('zlib');
const ExifReader = require('exifreader');
const NodeGeocoder = require('node-geocoder');
const { Client } = require("youtubei");
const GooglePhotosAlbum = require('google-photos-album-image-url-fetch');

async function getGooglePhotos(photosUrl) {
    const photolist = await GooglePhotosAlbum.fetchImageUrls(photosUrl);
    const photos = photolist.map(item => item.url);
    return photos;
}

function extractPlaylistId(url) {
    const regex = /[?&]list=([^#\&\?]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

async function getPlaylistVideoUrls(playlistUrl) {
    const playlistID = extractPlaylistId(playlistUrl);
    if (!playlistID)
        return;
    const youtube = new Client();
    const playlist = await youtube.getPlaylist(playlistID);
    const playlistItems = playlist.videos.items.map(item => {
        return {
            id: item.id,
            title: item.title,
            description: item.description,
            url: `https://www.youtube.com/watch?v=${item.id}`
        };
    });
    return playlistItems;
}

/*async function getPlaylistVideoUrls(playlistUrl) {
    try {
        const response = await axios.get(playlistUrl);
        const html = response.data;
        
        // Extract video URLs using a regular expression
        const videoUrlRegex = /watch\?v=([^"&]+)/g;
        const matches = html.matchAll(videoUrlRegex);
        
        const videoUrls = [...new Set([...matches].map(match => `https://www.youtube.com/watch?v=${match[1]}`))];
        
        if (videoUrls.length === 0) {
            console.warn('No video URLs found in playlist');
        }
        
        return videoUrls;
    } catch (error) {
        console.error('Error fetching playlist data:', error);
        throw error;
    }
}*/

async function geocode(location) {
    const options = {
        provider: 'openstreetmap',
        httpAdapter: 'https',
        formatter: null,
        apiKey: null, // Not required for OpenStreetMap
        userAgentHeader: 'User-Agent', // This is the key to set the correct header name
        headers: {
            'User-Agent': 'MVC-backend/1.0 (tapan@represent.org)'
        }
    };

    const geocoder = NodeGeocoder(options);

    const results = await geocoder.geocode(location);
    
    if (results && results.length > 0) {
        return results; // Return the first result
    } else {
        console.warn('No geocoding results found for:', location);
        return [];
    }
}

async function deleteContentFunc(content) {
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

    if (content.audiofile)
        await strapi.config.functions.deleteMediafile(content.audiofile.id);

    return await strapi.service('api::content.content').delete(content.id);
}

async function updateContentFunc(ctx, content) {
    strapi.config.functions.nullParam("lat", ctx.request.body);
    strapi.config.functions.nullParam("long", ctx.request.body);

    if ((!ctx.request.body.lat || !ctx.request.body.long) && ctx.request.body.location && ctx.request.body.location != content.location) {
        const locations = await geocode(ctx.request.body.location);
        if (locations.length > 0) {
            ctx.request.body.lat = locations[0].latitude;
            ctx.request.body.long = locations[0].longitude;
        }
    }

    if (ctx.request.body.published != undefined) {
        if (ctx.request.body.published == "true") {
            if (!content.publishedAt)
                ctx.request.body.publishedAt = new Date();
        } else {
            ctx.request.body.publishedAt = null;
        }
    }    

    const newcontent = await strapi.query("api::content.content").update({
        where: { id: content.id },
        data: ctx.request.body,
        populate: {
            channel: {
                select: ['id', 'uniqueID'],
                populate: {
                    owner: { select: ['id'] },
                }
            },
            mediafile: {
                select: ['id', 'mime'],
            },
            audiofile: {
                select: ['id', 'mime'],
            },
        }
    });

    if (ctx.request.files['audiofile'])
    {
        if (newcontent.audiofile?.id)
            await strapi.config.functions.deleteMediafile(newcontent.audiofile.id);
        await strapi.config.functions.addFile(content.id, 'api::content.content', ctx.request.files['audiofile'], "audiofile");
    }
    else
    {
        if (newcontent.audiofile && ctx.request.body.deleteaudio == "true")
            await strapi.config.functions.deleteMediafile(newcontent.audiofile.id);
    }

    if (ctx.request.files['mediafile'])
    {
        if (newcontent.mediafile?.id)
        {
            // TAP: move the audio file over
            if (newcontent.mediafile.mime.startsWith("audio"))
            {
                await strapi.query("api::content.content").update({
                    where: { id: newcontent.id },
                    data: { 
                        audiofile: newcontent.mediafile.id
                    },
                });
            }
            else
                await strapi.config.functions.deleteMediafile(newcontent.mediafile.id);
        }
        await strapi.config.functions.addFile(content.id, 'api::content.content', ctx.request.files['mediafile'], "mediafile");
    }
    else
    {
        if (newcontent.mediafile && ctx.request.body.deletemedia == "true")
            await strapi.config.functions.deleteMediafile(newcontent.mediafile.id);
    }

    if (ctx.request.body.order)
        await insertContentFunc(newcontent, ctx.request.body.order);
    else if (ctx.request.body.uniqueID && (ctx.request.body.uniqueID != content.channel.uniqueID))
        await insertContentFunc(newcontent, -1);

    if (ctx.request.body.caption && content.mediafile?.id)
        await strapi.plugins.upload.services.upload.update(content.mediafile.id, { caption: ctx.request.body.caption })

    // Maustro
    //if (ctx.request.body.ext_url && content.mediafile)
    //    await strapi.config.functions.deleteMediafile(content.mediafile.id);

    return newcontent;
}

async function uploadJSONFunc(channelid, contents, published, contributor)
{
    let newcontents = [];
    contents.forEach(async (element)=> {
        const contentItem = await createContentFunc({
            channelID: channelid,
            title: element.title,
            name: element.name,
            location: element.location,
            description: element.description,
            ext_url: element.ext_url,
            order: element.order,
            lat: element.lat,
            long: element.long,
            published,
            audioFile: null,
            contributor
        });
        newcontents.push(contentItem);
    });
    return newcontents;
}

async function createContentFunc({ channelID, file, title, name, location, description, ext_url, order, lat, long, published, textalignment, background_color, foreground_color, audioFile, contributor }) {
    if (!channelID)
        return null;

    let publishedAt = null;
    if (published != undefined && published == "true")
        publishedAt = new Date();

    if (!lat || !long) {
        if (location)
        {
            const locations = await geocode(location);
            if (locations.length > 0) {
                lat = locations[0].latitude;
                long = locations[0].longitude;
            }
        }
    }

    if (ext_url && ext_url.includes('youtube.com/playlist')) {
        try {
            const items = await getPlaylistVideoUrls(ext_url);
            for (const item of items) {
                await createContentFunc({
                    channelID,
                    title: item["title"],
                    name,
                    location,
                    description: item["description"],
                    ext_url: item["url"],
                    order,
                    lat,
                    long,
                    published,
                    textalignment,
                    background_color,
                    foreground_color,
                    audioFile,
                    contributor
                });
            }
            return "ok";
        } catch (error) {
            console.error('Error processing playlist:', error);
            return null;
        }
    }

    if (ext_url && ext_url.includes('photos.google.com/share')) {
        try {
            const items = await getGooglePhotos(ext_url);
            for (const item of items) {
                await createContentFunc({
                    channelID,
                    title: null,
                    name,
                    location,
                    description: null,
                    ext_url: item,
                    order,
                    lat,
                    long,
                    published,
                    textalignment,
                    background_color,
                    foreground_color,
                    audioFile,
                    contributor
                });
            }
            return "ok";
        } catch (error) {
            console.error('Error processing photos:', error);
            return null;
        }
    }

    const content = await strapi.db.query('api::content.content').create({
        data: {
            channel: channelID,
            title,
            name,
            location,
            description,
            ext_url,
            lat,
            long,
            publishedAt,
            textalignment,
            background_color,
            foreground_color,
            contributor
        },
        populate: {
            channel: {
                select: ['id', 'public', 'allowsubmissions'],
            },
        }
    });

    if (!content)
        return null;

    if (order)
        await insertContentFunc(content, order);
    else
        await insertContentFunc(content, -1);

    if (file)
        await strapi.config.functions.addFile(content.id, 'api::content.content', file, "mediafile");

    if (audioFile)
        await strapi.config.functions.addFile(content.id, 'api::content.content', audioFile, "audiofile");

    return content;
}

async function uploadContentFunc(ctx, channel)
{
    strapi.config.functions.nullParam("lat", ctx.request.body);
    strapi.config.functions.nullParam("long", ctx.request.body);

    if (ctx.request.files && Object.keys(ctx.request.files).length) 
    {
        var files = ctx.request.files;
        let contents = [];
        const contentItems = await strapi.db.query('api::content.content').findMany({
            where: { channel: channel.id },
            select: ['id', 'order'],
            orderBy: { order: 'asc' },
            populate: {
                channel: {
                    select: ['id', 'public', 'allowsubmissions'],
                },
            }
        });
        let order = null;
        if (contentItems?.length)
            order = parseInt(contentItems[contentItems.length - 1].order) + 1;
        if (!order)
            order = -1;

        const audioFile = files["audiofile"];
        for (const key of Object.keys(files)) {
            try {
                const mimetype = mime.getType(files[key].name);
                if (mimetype?.toLowerCase() == "text/csv")
                {
                    const csvToJson = require('convert-csv-to-json');
                    const jsondata = csvToJson.supportQuotedField(true).fieldDelimiter(',').getJsonFromCsv(files[key].path);
                    const newcontents = uploadJSONFunc(channel.id, jsondata, ctx.request.body.published, ctx.state.user?.id);
                    contents = contents.concat(newcontents);
                }
                else
                {
                    if (key == "audiofile")
                        continue;

                    if (!ctx.request.body.lat && mimetype?.startsWith('image/')) {
                        const imageBuffer = fs.readFileSync(files[key].path);
                        const tags = await ExifReader.load(imageBuffer, {expanded: true}); 
                        if (tags.gps && tags.gps.Latitude && tags.gps.Longitude) {
                            ctx.request.body.lat = tags.gps.Latitude;
                            ctx.request.body.long = tags.gps.Longitude;
                        }
                    }
                
                    const content = await createContentFunc({
                        file: files[key],
                        channelID: channel.id,
                        title: ctx.request.body.title,
                        name: ctx.request.body.name,
                        location: ctx.request.body.location,
                        description: ctx.request.body.description,
                        ext_url: ctx.request.body.ext_url,
                        order: order,
                        lat: ctx.request.body.lat,
                        long: ctx.request.body.long,
                        published: ctx.request.body.published,
                        textalignment: ctx.request.body.textalignment,
                        background_color: ctx.request.body.background_color,
                        foreground_color: ctx.request.body.foreground_color,
                        audioFile: audioFile,
                        contributor: ctx.state.user?.id
                    });
                    if (!content) return ctx.badRequest('Could not create content');
                    contents.push(content);
                    order = order + 1;
                }
            }
            catch (error) {
                return ctx.badRequest(error);
            }
        };
        return contents;
    }
    else
    {
        const content = await createContentFunc({
            channelID: channel.id,
            title: ctx.request.body.title,
            name: ctx.request.body.name,
            location: ctx.request.body.location,
            description: ctx.request.body.description,
            ext_url: ctx.request.body.ext_url,
            order: ctx.request.body.order,
            lat: ctx.request.body.lat,
            long: ctx.request.body.long,
            textalignment: ctx.request.body.textalignment,
            background_color: ctx.request.body.background_color,
            foreground_color: ctx.request.body.foreground_color,
            published: ctx.request.body.published,
            audioFile: null,
            contributor: ctx.state.user?.id
        });    
        if (!content) 
            return ctx.badRequest("Could not create content");
        else
            return [content];
    }
}

// TODO: Make sure its in order?
async function insertContentFunc(content, order) {

    const contentItems = await strapi.db.query('api::content.content').findMany({
        where: { $and: [{ channel: content.channel.id }, { $not: { id: content.id } }] },
        select: ['id', 'order'],
        orderBy: { order: 'asc' },
    });

    if (order == -1)
    {
        if (contentItems?.length && contentItems[contentItems.length - 1].order)
            order = contentItems[contentItems.length - 1].order + 1;
        else
            order = 1;
    }
    
    var currOrder = 1;
    for (const contentItem of contentItems)
    {
        if (contentItem.id != content.id)
            await strapi.query("api::content.content").update({
                where: { id: contentItem.id },
                data: { order: currOrder < order ? currOrder : currOrder + 1 },
        });
        currOrder = currOrder + 1;
    }

    return await strapi.query("api::content.content").update({
        where: { id: content.id },
        data: { order: order ? Math.min(currOrder, order) : currOrder}
    });
}

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::content.content');

module.exports = createCoreController('api::content.content', ({ strapi }) => ({

    async getAllContentForChannel(ctx) {

        const canEdit = await strapi.config.functions.canEdit(ctx.query.uniqueID, ctx.state.user.id);
        if (!canEdit) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.query.uniqueID);
        
        const myContents = await strapi.db.query('api::content.content').findMany({
            where: {channel: {uniqueID: ctx.query.uniqueID}},
            orderBy: { order: 'asc' },
            populate: {
                mediafile: {
                    select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                },
                audiofile: {
                    select: ['id', 'name', 'url', 'size', 'caption'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                    }
                },
                tags: {
                    select: ['id', 'tag', 'markercolor'],
                    populate: {
                        thumbnail: { select: ['url', 'formats'] },
                    }
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
                audiofile: {
                    select: ['id', 'name', 'url', 'size', 'caption', 'formats'],
                },
                channel: {
                    select: ['id', 'uniqueID'],
                    populate: {
                        owner: { select: ['id'] },
                    }
                },
                tags: {
                    select: ['id', 'tag', 'markercolor'],
                    populate: {
                        thumbnail: { select: ['url', 'formats'] },
                    }                
                },
            },
        });
        return myContents;
    },

    async uploadContentToChannel(ctx) {

        const channel = await strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id);
        if (!channel) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);

        if (ctx.request.body.contentID)
        {
            const contentItem = await strapi.db.query('api::content.content').findOne({
                where: { id: ctx.request.body.contentID },
                populate: {
                    mediafile: {
                        select: ['id'],
                    },
                    audiofile: {
                        select: ['id'],
                    },
                }
            });

            /* Maustro
            if (contentItem.mediafile)
            {
                await strapi.config.functions.deleteMediafile(contentItem.mediafile.id);
                await strapi.config.functions.deleteMediafile(contentItem.audiofile.id);
                await strapi.query("api::content.content").update({
                where: { id: ctx.request.body.contentID},
                data: { ext_url: null }});
            }*/
            
            if (ctx.request.files && Object.keys(ctx.request.files).length)
            {
                await strapi.config.functions.deleteMediafile(contentItem.mediafile.id);
                await strapi.config.functions.addFile(ctx.request.body.contentID, 'api::content.content', ctx.request.files[Object.keys(ctx.request.files)], "mediafile");
                // await strapi.config.functions.deleteMediafile(contentItem.audiofile.id);
            }
            
            if (ctx.request.body.ext_url)
                await strapi.query("api::content.content").update({
                    where: { id: ctx.request.body.contentID},
                    data: { ext_url: ctx.request.body.ext_url },
                });   
            
            return "ok";
        }
        else
        {
            const channel = await strapi.config.functions.getChannel(ctx.request.body.uniqueID);
            return await uploadContentFunc(ctx, channel);
        }
    },

    async updateContent(ctx) {
        if (!ctx.request.body.contentID)
            return ctx.badRequest('No content specified');
        
        const content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID },
            select: ['id', 'publishedAt', 'location'],
            populate: {
                mediafile: { select: ['id'] },
                audiofile: { select: ['id'] },
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
    
        const srcChannel = await strapi.config.functions.canEdit(content.channel.uniqueID, ctx.state.user.id);
        if (!srcChannel)
            return ctx.badRequest('No such channel or you are not allowed to edit');
    
        if (ctx.request.body.uniqueID) {
            const destChannel = await strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id);
            if (!destChannel) 
                return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);
            ctx.request.body["channel"] = {connect: [{id: destChannel.id}]};        
        }
    
        return await updateContentFunc(ctx, content);
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
                audiofile: {
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

        const canEdit = await strapi.config.functions.canEdit(content.channel.uniqueID, ctx.state.user.id);
        if (!canEdit) 
            return ctx.badRequest('No such channel or you are not allowed to edit');

        return await deleteContentFunc(content);
    },

    async uploadSubmission(ctx) {

        let channel = null;
        if (ctx.request.body.privateID)
            channel = await strapi.config.functions.getChannel(null, null, ctx.request.body.privateID);
        else
            channel = await strapi.db.query('api::channel.channel').findOne({
                        select: ['id', 'allowsubmissions'],
                        where: { 
                            uniqueID: ctx.request.body.uniqueID,
                        }
                    });

        if (!channel?.allowsubmissions && !ctx.request.body.privateID)
            return ctx.badRequest('This channel does not allow submissions ' + ctx.request.body.uniqueID);
        
        return await uploadContentFunc(ctx, channel);
    },

    async updateSubmission(ctx) {
        if (!ctx.request.body.contentID || !ctx.request.body.privateID)
            return ctx.badRequest('No content specified');

        const channel = await strapi.config.functions.canEdit(null, null, ctx.request.body.privateID);
        
        if (!channel)
            return ctx.badRequest('This channel doesnt exist or doesnt allow you to edit without logging in');
        
        const content = await strapi.db.query('api::content.content').findOne({
            where: { id: ctx.request.body.contentID, channel: channel.id },
            select: ['id', 'publishedAt', 'location'],
            populate: {
                mediafile: { select: ['id'] },
                audiofile: { select: ['id'] },
                channel: {
                    select: ['id', 'uniqueID', 'allowsubmissions'],
                    populate: {
                        owner: { select: ['id'] },
                        editors: { select: ['id'] },
                    }
                },
            }
        });
    
        if (!content)
            return ctx.badRequest('No content found');
    
        return await updateContentFunc(ctx, content);
    },
    
    async deleteSubmission(ctx) {
        if (!ctx.request.body.contentID || !ctx.request.body.privateID)
            return ctx.badRequest('No content specified');

        const channel = await strapi.config.functions.canEdit(null, null, ctx.request.body.privateID);
        
        const content = await strapi.db.query('api::content.content').findOne({
            select: ['order'],
            where: {
                id: ctx.request.body.id,
                channel: channel.id
            },
            populate: {
                mediafile: {
                    select: ['id'],
                },
                audiofile: {
                    select: ['id'],
                },
                channel: {
                    select: ['id', 'uniqueID', 'allowsubmissions']
                },
            },
        });

        if (!content)
            return ctx.badRequest('No such content: ' + ctx.request.body.id);

        return await deleteContentFunc(content);
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

        const channel = await strapi.config.functions.canEdit(content.channel.uniqueID, ctx.state.user.id)
        if (!channel)
            return ctx.badRequest('No such channel or you are not allowed to edit');

        if (content.mediafile?.id)
            await strapi.plugins.upload.services.upload.update(content.mediafile.id, { caption: ctx.request.body.caption });

        return "ok";
    },

    async uploadJSONToChannel(ctx) {

        if (!ctx.request.body.contents) 
            return ctx.badRequest('No contents provided in JSON');

        const channel = await strapi.config.functions.canEdit(ctx.request.body.uniqueID, ctx.state.user.id);
        if (!channel) 
            return ctx.badRequest('No such channel or you are not allowed to edit: ' + ctx.request.body.uniqueID);

        const channelid = ctx.request.body.id || channel.id;
        await uploadJSONFunc(channelid, ctx.request.body.contents, ctx.request.body.published, ctx.state.user.id);

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
