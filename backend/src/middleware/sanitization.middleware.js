import { body, param } from 'express-validator';

export const sanitizeInput = [
    body('*').trim().escape(),
    param('*').trim().escape()
];
