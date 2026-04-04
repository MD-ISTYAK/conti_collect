const Joi = require('joi');

const pickupSchema = {
  body: Joi.object({
    dealerName: Joi.string().trim().required()
      .messages({ 'any.required': 'Dealer name is required for pickup confirmation' }),
    gpsLocation: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
      accuracy: Joi.number().allow(null),
      address: Joi.string().trim().allow('', null),
    }).required()
      .messages({ 'any.required': 'GPS location is required for pickup' }),
  }),
};

const receiveSchema = {
  body: Joi.object({
    receivedQuantity: Joi.number().integer().min(0).required()
      .messages({ 'any.required': 'Received quantity is required' }),
    conditionNotes: Joi.string().trim().allow('', null),
  }),
};

const regionSchema = {
  body: Joi.object({
    cfaId: Joi.string().required(),
    regionName: Joi.string().trim().required(),
    states: Joi.array().items(Joi.string().trim()).min(1).required(),
    cities: Joi.array().items(Joi.string().trim()).default([]),
    pincodes: Joi.array().items(Joi.string().pattern(/^\d{6}$/)).default([]),
  }),
};

module.exports = { pickupSchema, receiveSchema, regionSchema };
