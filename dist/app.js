"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_status_codes_1 = require("http-status-codes");
const authRoute_1 = __importDefault(require("./routes/authRoute"));
dotenv_1.default.config({ path: './.env' });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use('/auth', authRoute_1.default);
app.get('/', (_req, res) => {
    return res.status(http_status_codes_1.StatusCodes.OK).send('API is running');
});
app.listen(PORT, () => {
    console.log(`Server is running on PORT:${PORT}`);
});
