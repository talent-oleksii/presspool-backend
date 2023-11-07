"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dataController_1 = __importDefault(require("../controller/dataController"));
const router = express_1.default.Router();
// Define routes
router.get('/newsletter', dataController_1.default.getNewsletter);
router.get('/pricing', dataController_1.default.getPricing);
router.post('/campaign', dataController_1.default.addCampaign);
exports.default = router;
