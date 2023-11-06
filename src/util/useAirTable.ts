import axios from 'axios';

const useAirTable = (tableName: string, methodType: string, data?: any) => {
    const apiUrl = 'https://api.airtable.com/v0/';
    const airtablePat = process.env.AIRTABLE_PAT;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (methodType === 'get') {
        if (data && Object.keys(data).length >= 1) {
            const keyLength = Object.keys(data).length;

            let query = "AND(";
            Object.keys(data).forEach((key, index) => {
                query = `${query}{${key}} = '${data[key]}'`;
                if (index < keyLength - 1)
                query = `${query}, `;
            });
            query = query.concat(')');
    
            console.log('query:', query);
            return axios.get(`${apiUrl}${baseId}/${tableName}`, {
                headers: {
                    'Authorization': `Bearer ${airtablePat}`,
                },
                params: {
                    filterByFormula: query,
                }
            });
        } else {
            return axios.get(`${apiUrl}${baseId}/${tableName}`, {
                headers: {
                    'Authorization': `Bearer ${airtablePat}`,
                },
            });
        }
    } else if (methodType === 'post') {
        return axios.post(`${apiUrl}${baseId}/${tableName}`, {
            fields: data,
        }, {
            headers: {
                'Authorization': `Bearer ${airtablePat}`,
                'Content-Type': 'application/json',
            }
        });
    }
};

export default useAirTable;