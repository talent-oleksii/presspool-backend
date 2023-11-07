"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const status_codes_1 = require("http-status-codes/build/cjs/status-codes");
const db_1 = __importDefault(require("../util/db"));
const useAirTable_1 = __importDefault(require("../util/useAirTable"));
const logger_1 = __importDefault(require("../util/logger"));
const getNewsletter = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    logger_1.default.info('get newsletter called');
    (_a = (0, useAirTable_1.default)('Newsletters', 'get')) === null || _a === void 0 ? void 0 : _a.then(data => {
        return res.status(status_codes_1.StatusCodes.OK).json(data.data);
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
});
const getPricing = (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    logger_1.default.info('get pricing called');
    (_b = (0, useAirTable_1.default)('Pricing', 'get')) === null || _b === void 0 ? void 0 : _b.then(data => {
        return res.status(status_codes_1.StatusCodes.OK).json(data.data);
    }).catch(error => {
        logger_1.default.error('get pricig error:', error.message);
        return res.status(status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
});
const addCampaign = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.default.info('add campaign called');
    console.log('body:', req.body);
    const result = yield db_1.default.query('INSERT INTO campaign(email, name, url, demographic, newsletter, price) VALUES($1, $2, $3, $4, $5, $6) RETURNING *', [
        req.body.email,
        req.body.campaignName,
        req.body.url,
        req.body.currentTarget,
        req.body.currentAudience,
        req.body.currentPrice,
    ]);
    return res.status(200).json(result.rows[0]);
});
const data = {
    getNewsletter,
    getPricing,
    addCampaign,
};
exports.default = data;
