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
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_status_codes_1 = require("http-status-codes");
const authRoute_1 = __importDefault(require("./routes/authRoute"));
const dataRoute_1 = __importDefault(require("./routes/dataRoute"));
dotenv_1.default.config({ path: './.env' });
const db_1 = __importDefault(require("./util/db"));
const logger_1 = __importDefault(require("./util/logger"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: false }));
app.use('/auth', authRoute_1.default);
app.use('/data', dataRoute_1.default);
app.get('/', (_req, res) => {
    return res.status(http_status_codes_1.StatusCodes.OK).send('API is running');
});
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    logger_1.default.info(`Server is running on PORT:${PORT}`);
    yield db_1.default.testConnection();
}));
