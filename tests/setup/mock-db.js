import { MOCK_CITIES, MOCK_LANES } from '../mock-data.js';

function makeChainable(filtered, baseFilter = () => true) {
    return {
        data: filtered,
        error: null,
        not: (column, operator, value) => {
            const nextFilter = item => baseFilter(item) && 
                operator === 'is' ? item[column] !== value : true;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        neq: (column, value) => {
            const nextFilter = item => baseFilter(item) && item[column] !== value;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
        eq: (column, value) => {
            const nextFilter = item => baseFilter(item) && item[column] === value;
            return makeChainable(filtered.filter(nextFilter), nextFilter);
        },
                    neq: (column2, value2) => {
                        const nextFilter = item => baseFilter(item) && item[column2] !== value2;
                        const nextFiltered = filtered.filter(nextFilter);
                        return {
                            data: nextFiltered,
                            error: null,
                            neq: (column3, value3) => ({
                                data: nextFiltered.filter(item => item[column3] !== value3),
                                error: null
                            }),
                            lt: (column3, value3) => ({
                                data: nextFiltered.filter(item => item[column3] < value3),
                                error: null
                            })
                        };
                    }
                };
                return result;
            }
                    })
                })
            }),
            eq: (column, value) => ({
                data: table === 'cities' ? 
                    MOCK_CITIES.filter(c => c[column] === value) :
                    table === 'lanes' ? 
                    MOCK_LANES.filter(l => l[column] === value) : [],
                error: null,
                eq: (col2, val2) => ({
                    data: table === 'cities' ? 
                        MOCK_CITIES.filter(c => c[column] === value && c[col2] === val2) :
                        table === 'lanes' ? 
                        MOCK_LANES.filter(l => l[column] === value && l[col2] === val2) : [],
                    error: null,
                    single: () => Promise.resolve({
                        data: table === 'cities' ? 
                            MOCK_CITIES.find(c => c[column] === value && c[col2] === val2) :
                            table === 'lanes' ? 
                            MOCK_LANES.find(l => l[column] === value && l[col2] === val2) : null,
                        error: null
                    })
                }),
                single: () => Promise.resolve({
                    data: table === 'cities' ? 
                        MOCK_CITIES.find(c => c[column] === value) :
                        table === 'lanes' ? 
                        MOCK_LANES.find(l => l[column] === value) : null,
                    error: null
                })
            }),
            single: () => Promise.resolve({
                data: table === 'cities' ? MOCK_CITIES[0] :
                      table === 'lanes' ? MOCK_LANES[0] : null,
                error: null
            })
        }),
        insert: (rows) => Promise.resolve({
            data: rows,
            error: null,
            then: (callback) => Promise.resolve(callback({ data: rows, error: null }))
        }),
        upsert: (rows) => Promise.resolve({
            data: rows,
            error: null,
            then: (callback) => Promise.resolve(callback({ data: rows, error: null }))
        }),
        delete: () => ({
            match: (criteria) => Promise.resolve({
                data: [],
                error: null,
                then: (callback) => Promise.resolve(callback({ data: [], error: null }))
            })
        }),
        single: () => Promise.resolve({
            data: table === 'cities' ? MOCK_CITIES[0] :
                  table === 'lanes' ? MOCK_LANES[0] : null,
            error: null
        }),
        eq: (column, value) => ({
            single: () => Promise.resolve({
                data: table === 'cities' ? 
                    MOCK_CITIES.find(c => c[column] === value) :
                    table === 'lanes' ? 
                    MOCK_LANES.find(l => l[column] === value) : null,
                error: null
            }),
            eq: (col2, val2) => ({
                single: () => Promise.resolve({
                    data: table === 'cities' ? 
                        MOCK_CITIES.find(c => c[column] === value && c[col2] === val2) :
                        table === 'lanes' ? 
                        MOCK_LANES.find(l => l[column] === value && l[col2] === val2) : null,
                    error: null
                }),
                data: table === 'cities' ? 
                        MOCK_CITIES.filter(c => c[column] === value && c[col2] === val2) :
                        table === 'lanes' ? 
                        MOCK_LANES.filter(l => l[column] === value && l[col2] === val2) : [],
                error: null
            })
        }),
        match: (criteria) => Promise.resolve({
            data: table === 'cities' ? 
                MOCK_CITIES.filter(c => Object.entries(criteria)
                    .every(([key, value]) => c[key] === value)) :
                table === 'lanes' ? 
                MOCK_LANES.filter(l => Object.entries(criteria)
                    .every(([key, value]) => l[key] === value)) : [],
            error: null,
            then: (callback) => Promise.resolve(callback({ 
                data: table === 'cities' ? 
                    MOCK_CITIES.filter(c => Object.entries(criteria)
                        .every(([key, value]) => c[key] === value)) :
                    table === 'lanes' ? 
                    MOCK_LANES.filter(l => Object.entries(criteria)
                        .every(([key, value]) => l[key] === value)) : [],
                error: null
            }))
        })
    })
};
