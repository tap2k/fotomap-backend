'use strict';

/**
 * tileset controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

//module.exports = createCoreController('api::tileset.tileset');

module.exports = createCoreController('api::tileset.tileset', ({ strapi }) =>  ({

    async getTilesets(ctx) {
        const tilesets = await strapi.db.query('api::tileset.tileset').findMany({
            orderBy: { id: 'asc' },
        });
        return tilesets;
    },

}));

