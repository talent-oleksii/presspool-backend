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
const useAirTable_1 = __importDefault(require("../util/useAirTable"));
const logger_1 = __importDefault(require("../util/logger"));
const signIn = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    logger_1.default.info("Sign in api called");
    const { email, password } = req.query;
    console.log('d:', email, password);
    (_a = (0, useAirTable_1.default)('Users', 'get', {
        'Email': email,
        'Password': password,
    })) === null || _a === void 0 ? void 0 : _a.then(data => {
        console.log('dat:', data.data);
        return res.status(status_codes_1.StatusCodes.OK).json(data.data);
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(status_codes_1.StatusCodes.OK).json({ message: error.message });
    });
});
const clientSignUp = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    logger_1.default.info('Sign up api called');
    const { fullName, email, password, company } = req.body;
    (_b = (0, useAirTable_1.default)("Users", 'post', {
        'Full Name': fullName,
        'Email': email,
        'Password': password,
        'Company Name': company,
        'User Group': 'Client',
    })) === null || _b === void 0 ? void 0 : _b.then(data => {
        console.log('dat:', data);
        return res.status(status_codes_1.StatusCodes.OK).json(data.data);
    }).catch(error => {
        console.log('err:', error.message);
        return res.status(status_codes_1.StatusCodes.INTERNAL_SERVER_ERROR).json({ message: error.message });
    });
});
const auth = {
    signIn,
    clientSignUp,
};
exports.default = auth;
