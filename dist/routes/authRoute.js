"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = __importDefault(require("../controller/authController"));
const router = express_1.default.Router();
// Define routes
router.get('/sign-in', authController_1.default.signIn);
router.post('/client-sign-up', authController_1.default.clientSignUp);
exports.default = router;
