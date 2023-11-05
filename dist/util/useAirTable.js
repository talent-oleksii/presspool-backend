"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = __importDefault(require("axios"));
const useAirTable = (tableName, methodType, data) => {
    const apiUrl = 'https://api.airtable.com/v0/';
    const airtablePat = process.env.AIRTABLE_PAT;
    const baseId = process.env.AIRTABLE_BASE_ID;
    if (methodType === 'get') {
        let query = "AND(";
        const keyLength = Object.keys(data).length;
        Object.keys(data).forEach((key, index) => {
            query = `${query}{${key}} = '${data[key]}'`;
            if (index < keyLength - 1)
                query = `${query}, `;
        });
        query = query.concat(')');
        console.log('query:', query);
        return axios_1.default.get(`${apiUrl}${baseId}/${tableName}`, {
            headers: {
                'Authorization': `Bearer ${airtablePat}`,
            },
            params: {
                filterByFormula: query,
            }
        });
    }
    else if (methodType === 'post') {
        return axios_1.default.post(`${apiUrl}${baseId}/${tableName}`, {
            fields: data,
        }, {
            headers: {
                'Authorization': `Bearer ${airtablePat}`,
                'Content-Type': 'application/json',
            }
        });
    }
};
exports.default = useAirTable;
