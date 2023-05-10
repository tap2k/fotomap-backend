'use strict';

/**
 * overlay service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::overlay.overlay');
